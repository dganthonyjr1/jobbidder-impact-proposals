import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { computeTotals, fmt, type MaterialLine, type LaborLine } from "@/lib/pricing";
import { sendEmailViaGHL, sendSmsViaGHL } from "@/lib/ghl.server";
import { callClaudeForEstimate, generateEstimateNumber, languageName, normalizeLanguage } from "@/lib/estimates.server";
import { sendLovableEmail } from "@lovable.dev/email-js";

const EMAIL_SITE_NAME = "Bidpilot";
const EMAIL_SENDER_DOMAIN = "notify.suddenimpactagency.io";
const EMAIL_FROM_DOMAIN = "suddenimpactagency.io";

type Lang = "en" | "es" | "fr" | "pt" | "ht";

function proposalSms(lang: Lang, business: string, num: string, url: string): string {
  switch (lang) {
    case "es": return `${business}: Su propuesta ${num} está lista. Verla: ${url}`;
    case "fr": return `${business} : Votre proposition ${num} est prête. Voir : ${url}`;
    case "pt": return `${business}: A sua proposta ${num} está pronta. Ver: ${url}`;
    case "ht": return `${business}: Pwopozisyon ou ${num} pare. Gade li: ${url}`;
    default: return `${business}: Your proposal ${num} is ready. View: ${url}`;
  }
}

function estimateSms(lang: Lang, name: string, business: string, url: string): string {
  switch (lang) {
    case "es": return `Hola ${name}, aquí está su estimación aproximada de ${business}: ${url}  Responda si desea una propuesta completa.`;
    case "fr": return `Bonjour ${name}, voici votre estimation de ${business} : ${url}  Répondez si vous souhaitez une proposition complète.`;
    case "pt": return `Olá ${name}, aqui está a sua estimativa de ${business}: ${url}  Responda se quiser uma proposta completa.`;
    case "ht": return `Bonjou ${name}, men estimasyon ou de ${business}: ${url}  Reponn si w vle yon pwopozisyon konplè.`;
    default: return `Hi ${name}, here's your ballpark estimate from ${business}: ${url}  Reply if you'd like a full proposal.`;
  }
}

function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function sendProposalEmail(opts: {
  to: string;
  proposal: any;
  contractor: { business_name: string | null } | null;
  proposalUrl: string;
  contactName?: string | null;
  contactPhone?: string | null;
  language?: string | null;
}) {
  const normalized = opts.to.toLowerCase().trim();
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails").select("email").eq("email", normalized).maybeSingle();
  if (suppressed) return { skipped: "suppressed" };

  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens").select("token, used_at").eq("email", normalized).maybeSingle();
  let unsubToken: string;
  if (existing?.token && !existing.used_at) unsubToken = existing.token;
  else if (existing?.used_at) return { skipped: "already_unsubscribed" };
  else {
    const t = genToken();
    await supabaseAdmin.from("email_unsubscribe_tokens")
      .upsert({ email: normalized, token: t }, { onConflict: "email" });
    const { data: stored } = await supabaseAdmin.from("email_unsubscribe_tokens")
      .select("token").eq("email", normalized).maybeSingle();
    unsubToken = stored?.token || t;
  }

  const materials = (opts.proposal.materials || []) as MaterialLine[];
  const labor = (opts.proposal.labor || []) as LaborLine[];
  const totals = computeTotals(materials, labor, "better", Number(opts.proposal.tax_rate) || 0.07);
  const templateData = {
    clientName: opts.proposal.client_name,
    businessName: opts.contractor?.business_name,
    proposalNumber: opts.proposal.proposal_number,
    jobAddress: opts.proposal.job_address,
    tradeType: opts.proposal.trade_type,
    totalAmount: fmt(totals.grandTotal),
    proposalUrl: opts.proposalUrl,
  };
  const tpl = TEMPLATES["proposal-ready"];
  if (!tpl) return { skipped: "no_template" };
  const element = React.createElement(tpl.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = typeof tpl.subject === "function" ? tpl.subject(templateData) : tpl.subject;

  const ghlResult = await sendEmailViaGHL({
    to: normalized,
    subject,
    html,
    text,
    contactName: opts.contactName || opts.proposal.client_name,
    contactPhone: opts.contactPhone || opts.proposal.client_phone,
    language: opts.language || opts.proposal.language,
  });
  if (ghlResult.ok) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: ghlResult.messageId || crypto.randomUUID(),
      template_name: "proposal-ready",
      recipient_email: normalized,
      status: "sent",
    });
    return { provider: "ghl", ...ghlResult };
  }

  let directEmailError: string | null = null;
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  if (lovableApiKey) {
    const directMessageId = crypto.randomUUID();
    try {
      await sendLovableEmail(
        {
          to: normalized,
          from: `${EMAIL_SITE_NAME} <noreply@${EMAIL_FROM_DOMAIN}>`,
          sender_domain: EMAIL_SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: "transactional",
          label: "proposal-ready",
          idempotency_key: `retell-proposal-${opts.proposal.id}-${normalized}`,
          unsubscribe_token: unsubToken,
          message_id: directMessageId,
        },
        { apiKey: lovableApiKey, sendUrl: process.env.LOVABLE_SEND_URL }
      );
      await supabaseAdmin.from("email_send_log").insert({
        message_id: directMessageId,
        template_name: "proposal-ready",
        recipient_email: normalized,
        status: "sent",
      });
      return { provider: "lovable_direct", ok: true, message_id: directMessageId, ghl_error: ghlResult.error };
    } catch (e) {
      directEmailError = (e as Error).message;
      console.warn("[retell webhook] direct proposal email send failed:", directEmailError);
    }
  } else {
    directEmailError = "LOVABLE_API_KEY is not configured";
  }

  const messageId = crypto.randomUUID();
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId, template_name: "proposal-ready",
    recipient_email: normalized, status: "pending",
  });
  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: normalized,
      from: `${EMAIL_SITE_NAME} <noreply@${EMAIL_FROM_DOMAIN}>`,
      sender_domain: EMAIL_SENDER_DOMAIN,
      subject, html, text,
      purpose: "transactional",
      label: "proposal-ready",
      idempotency_key: `retell-proposal-${opts.proposal.id}-${normalized}`,
      unsubscribe_token: unsubToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) return { provider: "queue", error: error.message, ghl_error: ghlResult.error, direct_error: directEmailError };
  return { provider: "queue", queued: true, message_id: messageId, ghl_error: ghlResult.error, direct_error: directEmailError };
}

type MaterialRow = {
  id: string; category: string; name: string; description: string | null;
  unit: string; sia_price: number | null; retail_price: number;
  restricted_states: string[] | null;
};

type AIShape = {
  scope_of_work: string;
  timeline: string;
  warranty: string;
  exclusions: string[];
  materials: { catalog_id?: string; item: string; description?: string; qty: number; unit: string; retail_price: number; sia_price?: number | null }[];
  labor: { task: string; description?: string; hours: number; rate: number }[];
  tiers: { good: { label: string; description: string }; better: { label: string; description: string }; best: { label: string; description: string } };
};

function buildFallbackProposal(opts: {
  contractor: { business_name: string; trade_type: string | null };
  job: {
    client_name: string; job_address: string | null; job_city: string | null;
    job_state: string | null; trade_type: string | null; job_description: string; job_scope: string | null;
  };
  catalog: MaterialRow[];
}): AIShape {
  const trade = (opts.job.trade_type || opts.contractor.trade_type || "general contracting").toString();
  const usableCatalog = (opts.catalog || []).slice(0, 6);
  const materials = usableCatalog.length
    ? usableCatalog.slice(0, 4).map((m) => ({
        catalog_id: m.id,
        item: m.name,
        description: m.description || `${m.category} material for ${trade} work`,
        qty: 1,
        unit: m.unit || "each",
        retail_price: Number(m.retail_price) || 0,
        sia_price: m.sia_price ?? null,
      }))
    : [
        { item: "Project materials allowance", description: "Allowance for standard materials, supplies, fasteners, and consumables", qty: 1, unit: "allowance", retail_price: 1250, sia_price: 1000 },
        { item: "Site protection and cleanup supplies", description: "Protection, disposal bags, cleanup, and jobsite consumables", qty: 1, unit: "allowance", retail_price: 300, sia_price: 240 },
      ];

  return {
    scope_of_work: `Prepare, coordinate, and complete the requested ${trade} work for ${opts.job.client_name}. Scope is based on the voice intake details: ${opts.job.job_scope || opts.job.job_description}. Final quantities, selections, and site conditions should be confirmed before work begins.`,
    timeline: "Estimated 3-7 business days after material selections and scheduling are confirmed.",
    warranty: "1-year workmanship warranty, excluding owner-supplied materials, pre-existing conditions, and normal wear.",
    exclusions: ["Permit fees unless explicitly listed", "Hidden damage or structural repairs not visible during intake", "Changes in material selections or scope after approval"],
    materials,
    labor: [
      { task: "Project setup and protection", description: "Mobilization, layout, protection, and preparation", hours: 4, rate: 85 },
      { task: `${trade} installation labor`, description: "Complete labor for the requested scope", hours: 16, rate: 95 },
      { task: "Cleanup and final walkthrough", description: "Debris removal, cleanup, and punch-list review", hours: 3, rate: 85 },
    ],
    tiers: {
      good: { label: "Good", description: "Essential scope with standard materials and finish quality" },
      better: { label: "Better", description: "Recommended scope with upgraded details and balanced value" },
      best: { label: "Best", description: "Premium finish level with enhanced materials and added detail" },
    },
  };
}

async function callClaude(opts: {
  apiKey: string;
  contractor: { business_name: string; trade_type: string | null };
  job: {
    client_name: string; job_address: string | null; job_city: string | null;
    job_state: string | null; trade_type: string | null;
    job_description: string; job_scope: string | null;
  };
  catalog: MaterialRow[];
  language?: string;
}): Promise<AIShape> {
  const restrictedNote = opts.job.job_state
    ? `Job is in ${opts.job.job_state}. Exclude any catalog item whose restricted_states includes that state.`
    : "";

  const catalogStr = opts.catalog
    .map((m) => `- id:${m.id} | ${m.category} | ${m.name}${m.description ? ` — ${m.description}` : ""} | unit:${m.unit} | sia:$${m.sia_price ?? "n/a"} | retail:$${m.retail_price}${m.restricted_states?.length ? ` | restricted:${m.restricted_states.join(",")}` : ""}`)
    .join("\n");
  const langName = languageName(opts.language);

  const system = `You are a senior estimator for ${opts.contractor.business_name} (${opts.contractor.trade_type || opts.job.trade_type || "general contracting"}). Produce a realistic, professional construction proposal in USD.

Rules:
- Prefer materials from the Sudden Impact Agency (SIA) wholesale catalog below. When you pick a catalog item, set catalog_id to its id and use sia_price for SIA and retail_price as listed.
- You may add custom line items not in the catalog when needed; set catalog_id to null and supply realistic retail_price and sia_price (sia_price ~15-25% below retail).
- Apply a 10% waste factor on all flooring, tile, paint and drywall quantities.
- Use realistic labor hours and rates for the trade and region.
- ${restrictedNote}
- Write ALL human-readable text (scope_of_work, timeline, warranty, exclusions, materials.item, materials.description, labor.task, labor.description, tiers.*.label, tiers.*.description) in ${langName}. Money stays in USD. JSON keys, catalog_id values, units (sq ft, ea, hr) and numeric fields are NOT translated.
- Return ONLY valid JSON. No prose, no markdown.`;

  const user = `CLIENT: ${opts.job.client_name}
ADDRESS: ${opts.job.job_address || "TBD"}${opts.job.job_city ? ", " + opts.job.job_city : ""}${opts.job.job_state ? ", " + opts.job.job_state : ""}
TRADE: ${opts.job.trade_type || "general"}
JOB DESCRIPTION: ${opts.job.job_description}
SCOPE NOTES: ${opts.job.job_scope || "(none)"}

SIA WHOLESALE MATERIALS CATALOG:
${catalogStr || "(catalog empty — generate realistic line items)"}

Return this exact JSON shape:
{
  "scope_of_work": "multi-paragraph scope",
  "timeline": "e.g. 5-7 business days",
  "warranty": "e.g. 1-year workmanship",
  "exclusions": ["string", ...],
  "materials": [{"catalog_id": "uuid or null", "item": "string", "description": "string", "qty": number, "unit": "string", "retail_price": number, "sia_price": number}],
  "labor": [{"task": "string", "description": "string", "hours": number, "rate": number}],
  "tiers": {
    "good":  {"label": "Good",   "description": "Essential quality"},
    "better":{"label": "Better", "description": "Recommended"},
    "best":  {"label": "Best",   "description": "Premium finishes"}
  }
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json: any = await res.json();
  const text: string = json?.content?.[0]?.text || "{}";
  // Strip code fences if Claude wraps the JSON.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const sliced = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(sliced) as AIShape;
}

export const Route = createFileRoute("/api/public/webhook/retell")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const contractorId = url.searchParams.get("contractor");
        if (!contractorId) return new Response("Missing contractor", { status: 400 });

        const body: any = await request.json().catch(() => ({}));
        const analysis = body?.call?.call_analysis?.custom_analysis_data || body?.custom_analysis_data || {};
        const transcript = body?.call?.transcript || body?.transcript || "";

        // Retell can fire multiple event types (call_started, call_ended, call_analyzed).
        // Only act on the final analyzed event so we have the structured data.
        const eventType = body?.event || body?.type;
        if (eventType && eventType !== "call_analyzed" && eventType !== "call_ended") {
          return Response.json({ ok: true, skipped: eventType });
        }

        const job = {
          client_name: analysis.caller_name || analysis.client_name || analysis.name || "Unknown Client",
          client_email: analysis.email || null,
          client_phone: analysis.phone || body?.call?.from_number || null,
          job_address: analysis.job_address || analysis.address || null,
          job_city: analysis.job_city || analysis.city || null,
          job_state: ((analysis.job_state || analysis.state || "") + "").slice(0, 2).toUpperCase() || null,
          job_description: analysis.job_description || analysis.scope || (transcript ? String(transcript).slice(0, 4000) : "Voice intake call"),
          job_scope: analysis.job_scope || analysis.scope || null,
          trade_type: analysis.trade_type || analysis.trade || null,
        };

        // Caller chose at start of call: "estimate" (quick ballpark) or "proposal" (full doc).
        // Default to "proposal" for backward compat.
        const docTypeRaw = (analysis.document_type || analysis.doc_type || "proposal").toString().toLowerCase().trim();
        const documentType: "estimate" | "proposal" = docTypeRaw === "estimate" ? "estimate" : "proposal";
        const language: Lang = normalizeLanguage(
          analysis.language || analysis.detected_language || analysis.caller_language || body?.call?.language,
        );

        // Look up contractor (for Claude context and per-contractor API key)
        const { data: contractor, error: cErr } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, trade_type, email, anthropic_api_key")
          .eq("id", contractorId)
          .maybeSingle();
        if (cErr || !contractor) return new Response("Contractor not found", { status: 404 });

        // Resolve Anthropic API key: contractor override → global fallback
        const anthropicKey =
          (contractor.anthropic_api_key && contractor.anthropic_api_key.trim()) ||
          process.env.ANTHROPIC_API_KEY ||
          "";

        // ---------- ESTIMATE BRANCH ----------
        if (documentType === "estimate") {
          let est: any = null;
          let estError: string | null = null;
          if (anthropicKey) {
            try {
              est = await callClaudeForEstimate({
                apiKey: anthropicKey,
                contractor: { business_name: contractor.business_name, trade_type: contractor.trade_type },
                job: {
                  client_name: job.client_name,
                  job_address: job.job_address,
                  job_state: job.job_state,
                  trade_type: job.trade_type,
                  job_description: job.job_description,
                },
                language,
              });
            } catch (e: any) {
              estError = e?.message || "Estimate generation failed";
              console.error("[retell webhook] estimate error:", estError);
            }
          } else {
            estError = "No Anthropic API key configured";
          }

          const validThrough = new Date();
          validThrough.setDate(validThrough.getDate() + 14);

          const { data: createdEst, error: estInsErr } = await supabaseAdmin
            .from("estimates")
            .insert({
              contractor_id: contractorId,
              estimate_number: generateEstimateNumber(),
              status: "draft",
              source: "retell",
              client_name: job.client_name,
              client_email: job.client_email,
              client_phone: job.client_phone,
              job_address: [job.job_address, job.job_city].filter(Boolean).join(", ") || null,
              job_state: job.job_state,
              trade_type: job.trade_type,
              language,
              scope_summary: est?.scope_summary || null,
              material_low: est?.material_low ?? null,
              material_high: est?.material_high ?? null,
              labor_low: est?.labor_low ?? null,
              labor_high: est?.labor_high ?? null,
              total_low: est?.total_low ?? null,
              total_high: est?.total_high ?? null,
              timeline_text: est?.timeline_text || null,
              valid_through: validThrough.toISOString().slice(0, 10),
              raw_input: { body, ai_error: estError },
            })
            .select("id, estimate_number")
            .single();
          if (estInsErr) return new Response(estInsErr.message, { status: 500 });

          const origin = `${url.protocol}//${url.host}`;
          const estimateUrl = `${origin}/e/${createdEst.id}`;

          let smsResult: any = null;
          if (job.client_phone) {
            try {
              smsResult = await sendSmsViaGHL({
                to: job.client_phone,
                body: estimateSms(language, job.client_name, contractor.business_name, estimateUrl),
                contactName: job.client_name,
                contactEmail: job.client_email || undefined,
                language,
              });
            } catch (e) {
              smsResult = { ok: false, error: (e as Error).message };
            }
          }

          return Response.json({
            ok: true,
            document_type: "estimate",
            estimate_id: createdEst.id,
            estimate_number: createdEst.estimate_number,
            estimate_url: estimateUrl,
            ai_error: estError,
            sms: smsResult,
            language,
          });
        }

        // ---------- PROPOSAL BRANCH (default) ----------
        // Load the SIA materials catalog (filter restricted states client-side)
        const { data: catalogRaw } = await supabaseAdmin
          .from("materials")
          .select("id, category, name, description, unit, sia_price, retail_price, restricted_states")
          .order("sort_order", { ascending: true });
        const catalog: MaterialRow[] = (catalogRaw || []).filter((m: any) => {
          if (!job.job_state) return true;
          return !(m.restricted_states || []).includes(job.job_state);
        });

        let ai: AIShape | null = null;
        let aiError: string | null = null;
        if (anthropicKey) {
          try {
            ai = await callClaude({
              apiKey: anthropicKey,
              contractor: { business_name: contractor.business_name, trade_type: contractor.trade_type },
              job,
              catalog,
              language,
            });
          } catch (e: any) {
            aiError = e?.message || "AI generation failed";
            console.error("[retell webhook] Claude error:", aiError);
            ai = buildFallbackProposal({ contractor, job, catalog });
          }
        } else {
          aiError = "No Anthropic API key configured (contractor or global)";
          ai = buildFallbackProposal({ contractor, job, catalog });
        }

        const validThrough = new Date();
        validThrough.setDate(validThrough.getDate() + 30);

        const insert = {
          contractor_id: contractorId,
          proposal_number: generateProposalNumber(),
          status: ai ? "draft" : "draft",
          source: "retell",
          client_name: job.client_name,
          client_email: job.client_email,
          client_phone: job.client_phone,
          job_address: [job.job_address, job.job_city].filter(Boolean).join(", ") || null,
          job_state: job.job_state,
          trade_type: job.trade_type,
          job_description: job.job_description,
          language,
          scope_of_work: ai?.scope_of_work || null,
          timeline: ai?.timeline || null,
          warranty: ai?.warranty || null,
          exclusions: ai?.exclusions || [],
          materials: ai?.materials || [],
          labor: ai?.labor || [],
          tiers: ai?.tiers || {},
          valid_through: validThrough.toISOString().slice(0, 10),
          raw_input: { body, ai_error: aiError },
        };

        const { data: created, error } = await supabaseAdmin
          .from("proposals")
          .insert(insert)
          .select("id, proposal_number")
          .single();
        if (error) return new Response(error.message, { status: 500 });

        // Build public proposal URL and notify the client
        const origin = `${url.protocol}//${url.host}`;
        const proposalUrl = `${origin}/p/${created.id}`;

        // Email the client (if we captured an email) with the proposal link.
        // Prefer GoHighLevel email when configured; fall back to the existing queued sender.
        let emailResult: any = null;
        if (job.client_email) {
          try {
            const { data: full } = await supabaseAdmin.from("proposals").select("*").eq("id", created.id).single();
            emailResult = await sendProposalEmail({
              to: job.client_email,
              proposal: full,
              contractor: { business_name: contractor.business_name },
              proposalUrl,
              contactName: job.client_name,
              contactPhone: job.client_phone,
              language,
            });
          } catch (e) {
            console.warn("[retell webhook] client email send failed:", (e as Error).message);
            emailResult = { error: (e as Error).message };
          }
        }

        // SMS the client (if we captured a phone) with the proposal link
        let smsResult: any = null;
        if (job.client_phone) {
          try {
            smsResult = await sendSmsViaGHL({
              to: job.client_phone,
              body: proposalSms(language, contractor.business_name, created.proposal_number, proposalUrl),
              contactName: job.client_name,
              contactEmail: job.client_email || undefined,
              language,
            });
          } catch (e) {
            console.warn("[retell webhook] sms send failed:", (e as Error).message);
            smsResult = { ok: false, error: (e as Error).message };
          }
        }

        return Response.json({
          ok: true,
          proposal_id: created.id,
          proposal_number: created.proposal_number,
          proposal_url: proposalUrl,
          ai_error: aiError,
          email: emailResult,
          sms: smsResult,
          language,
        });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
    },
  },
});