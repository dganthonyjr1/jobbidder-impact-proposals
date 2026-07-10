import * as React from "react";
import { render } from "@react-email/components";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { computeTotals, fmt, generateProposalNumber, type MaterialLine, type LaborLine } from "@/lib/pricing";
import { sendSmsViaGHL } from "@/lib/ghl.server";

const SITE_NAME = "Jobbidder";
const SENDER_DOMAIN = "notify.jobbidder.io";
const FROM_DOMAIN = "jobbidder.io";

const BodySchema = z.object({
  contractorId: z.string().uuid(),
  clientName: z.string().min(1).max(200).default("Test Client"),
  recipientEmail: z.string().email(),
  recipientPhone: z.string().min(7).max(20),
  jobAddress: z.string().max(500).default("245 Oak Street, Cape May, NJ"),
  jobState: z.string().length(2).default("NJ"),
  tradeType: z.string().max(100).default("flooring"),
  jobDescription: z.string().max(2000).default("Install 1200 sq ft of Armstrong luxury vinyl plank flooring"),
  jobScope: z.string().max(2000).default("1200 sq ft single story ranch home"),
});

function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function callClaude(opts: {
  apiKey: string;
  contractor: { business_name: string; trade_type: string | null };
  job: any;
  catalog: any[];
}) {
  const catalogStr = opts.catalog
    .map((m) => `- id:${m.id} | ${m.category} | ${m.name} | unit:${m.unit} | sia:$${m.sia_price ?? "n/a"} | retail:$${m.retail_price}`)
    .join("\n");
  const system = `You are a senior estimator for ${opts.contractor.business_name}. Produce a realistic construction proposal in USD. Prefer materials from the SIA catalog. Apply 10% waste factor on flooring/tile/paint/drywall. Return ONLY valid JSON.`;
  const user = `CLIENT: ${opts.job.client_name}\nADDRESS: ${opts.job.job_address}\nTRADE: ${opts.job.trade_type}\nDESCRIPTION: ${opts.job.job_description}\nSCOPE: ${opts.job.job_scope}\n\nSIA CATALOG:\n${catalogStr}\n\nReturn JSON: { "scope_of_work": string, "timeline": string, "warranty": string, "exclusions": string[], "materials": [{"catalog_id": "uuid or null", "item": string, "description": string, "qty": number, "unit": string, "retail_price": number, "sia_price": number}], "labor": [{"task": string, "description": string, "hours": number, "rate": number}], "tiers": {"good": {"label": "Good", "description": string}, "better": {"label": "Better", "description": string}, "best": {"label": "Best", "description": string}} }`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": opts.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j: any = await res.json();
  const txt: string = j?.content?.[0]?.text || "{}";
  const cleaned = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  return JSON.parse(s >= 0 && e > s ? cleaned.slice(s, e + 1) : cleaned);
}

export const Route = createFileRoute("/api/public/test-proposal-flow")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
      POST: async ({ request }) => {
        let input;
        try { input = BodySchema.parse(await request.json()); }
        catch (e) { return Response.json({ error: "Invalid request", details: (e as Error).message }, { status: 400 }); }

        // 1. Look up contractor
        const { data: contractor, error: cErr } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, trade_type, email, anthropic_api_key")
          .eq("id", input.contractorId)
          .maybeSingle();
        if (cErr) {
          const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "missing";
          console.error("[test-proposal-flow] contractor lookup failed", {
            contractorId: input.contractorId,
            supabaseHost,
            code: cErr.code,
            message: cErr.message,
            details: cErr.details,
            hint: cErr.hint,
          });
          return Response.json({
            error: "Contractor lookup failed",
            details: {
              supabaseHost,
              code: cErr.code,
              message: cErr.message,
              hint: cErr.hint,
            },
          }, { status: 500 });
        }
        if (!contractor) {
          const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "missing";
          const { data: visibleContractors, error: listErr } = await supabaseAdmin
            .from("contractors")
            .select("id")
            .limit(3);
          console.warn("[test-proposal-flow] contractor not found", {
            contractorId: input.contractorId,
            supabaseHost,
            visibleCount: visibleContractors?.length ?? null,
            listErrorCode: listErr?.code,
            listErrorMessage: listErr?.message,
          });
          return Response.json({
            error: "Contractor not found",
            details: {
              contractorId: input.contractorId,
              supabaseHost,
              visibleCount: visibleContractors?.length ?? null,
              listErrorCode: listErr?.code ?? null,
              listErrorMessage: listErr?.message ?? null,
            },
          }, { status: 404 });
        }

        // 2. Generate proposal via Claude
        const anthropicKey = (contractor.anthropic_api_key && contractor.anthropic_api_key.trim()) || process.env.ANTHROPIC_API_KEY || "";
        if (!anthropicKey) return Response.json({ error: "No Anthropic API key configured" }, { status: 500 });

        const { data: catalogRaw } = await supabaseAdmin
          .from("materials")
          .select("id, category, name, description, unit, sia_price, retail_price, restricted_states")
          .order("sort_order", { ascending: true });
        const catalog = (catalogRaw || []).filter((m: any) => !(m.restricted_states || []).includes(input.jobState));

        const job = {
          client_name: input.clientName,
          job_address: input.jobAddress,
          trade_type: input.tradeType,
          job_description: input.jobDescription,
          job_scope: input.jobScope,
        };

        let ai: any;
        try {
          ai = await callClaude({ apiKey: anthropicKey, contractor: { business_name: contractor.business_name, trade_type: contractor.trade_type }, job, catalog });
        } catch (e: any) {
          return Response.json({ error: "Claude generation failed", details: e?.message }, { status: 500 });
        }

        // 3. Insert proposal
        const validThrough = new Date();
        validThrough.setDate(validThrough.getDate() + 30);
        const { data: created, error: insErr } = await supabaseAdmin
          .from("proposals")
          .insert({
            contractor_id: contractor.id,
            proposal_number: generateProposalNumber(),
            status: "sent",
            source: "test",
            client_name: input.clientName,
            client_email: input.recipientEmail,
            client_phone: input.recipientPhone,
            job_address: input.jobAddress,
            job_state: input.jobState,
            trade_type: input.tradeType,
            job_description: input.jobDescription,
            scope_of_work: ai.scope_of_work || null,
            timeline: ai.timeline || null,
            warranty: ai.warranty || null,
            exclusions: ai.exclusions || [],
            materials: ai.materials || [],
            labor: ai.labor || [],
            tiers: ai.tiers || {},
            valid_through: validThrough.toISOString().slice(0, 10),
          })
          .select("*")
          .single();
        if (insErr || !created) return Response.json({ error: insErr?.message || "Insert failed" }, { status: 500 });

        const origin = new URL(request.url).origin;
        const proposalUrl = `${origin}/p/${created.id}`;

        // 4. Send email (queued via existing pipeline)
        const normalizedEmail = input.recipientEmail.toLowerCase().trim();
        let emailResult: any = { skipped: false };
        const { data: suppressed } = await supabaseAdmin.from("suppressed_emails").select("email").eq("email", normalizedEmail).maybeSingle();
        if (suppressed) {
          emailResult = { skipped: "suppressed" };
        } else {
          const { data: existing } = await supabaseAdmin.from("email_unsubscribe_tokens").select("token, used_at").eq("email", normalizedEmail).maybeSingle();
          let unsubToken: string;
          if (existing?.token && !existing.used_at) unsubToken = existing.token;
          else if (existing?.used_at) { emailResult = { skipped: "unsubscribed" }; }
          else {
            const t = genToken();
            await supabaseAdmin.from("email_unsubscribe_tokens").upsert({ email: normalizedEmail, token: t }, { onConflict: "email" });
            unsubToken = t;
          }
          if (!emailResult.skipped) {
            const materials = (created.materials || []) as MaterialLine[];
            const labor = (created.labor || []) as LaborLine[];
            const totals = computeTotals(materials, labor, "better", Number(created.tax_rate) || 0.07);
            const templateData = {
              clientName: created.client_name,
              businessName: contractor.business_name,
              proposalNumber: created.proposal_number,
              jobAddress: created.job_address,
              tradeType: created.trade_type,
              totalAmount: fmt(totals.grandTotal),
              proposalUrl,
            };
            const tpl = TEMPLATES["proposal-ready"];
            const element = React.createElement(tpl.component, templateData);
            const html = await render(element);
            const text = await render(element, { plainText: true });
            const subject = typeof tpl.subject === "function" ? tpl.subject(templateData) : tpl.subject;
            const messageId = crypto.randomUUID();
            await supabaseAdmin.from("email_send_log").insert({ message_id: messageId, template_name: "proposal-ready", recipient_email: normalizedEmail, status: "pending" });
            const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                message_id: messageId,
                to: normalizedEmail,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject, html, text,
                purpose: "transactional",
                label: "proposal-ready",
                idempotency_key: `test-${created.id}-${normalizedEmail}`,
                unsubscribe_token: unsubToken!,
                queued_at: new Date().toISOString(),
              },
            });
            emailResult = enqErr ? { error: enqErr.message } : { queued: true, message_id: messageId };
          }
        }

        // 5. Send SMS via GHL
        const smsBody = `${contractor.business_name}: Your proposal ${created.proposal_number} is ready. View: ${proposalUrl}`;
        const smsResult = await sendSmsViaGHL({ to: input.recipientPhone, body: smsBody });

        return Response.json({
          ok: true,
          proposal_id: created.id,
          proposal_number: created.proposal_number,
          proposal_url: proposalUrl,
          email: emailResult,
          sms: smsResult,
        });
      },
    },
  },
});