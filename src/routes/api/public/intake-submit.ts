import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";
import { checkAndDeductCredit } from "@/lib/credits.server";
import { mergePricing, resolveTradeRate, callGroqAI, type PricingSettings } from "@/lib/proposal-ai.server";
import { evaluatePrevailingWage } from "@/lib/prevailing-wage";
import { isNarrativeTrade, generateNarrativeProposal } from "@/lib/narrative-proposal.server";

const Body = z.object({
  slug: z.string().min(1).max(120),
  client_name: z.string().trim().min(1).max(200),
  client_email: z.string().trim().email().max(254),
  client_phone: z.string().trim().max(30).optional().default(''),
  job_address: z.string().trim().max(500).optional().nullable(),
  trade_type: z.string().trim().max(100).optional().nullable(),
  job_description: z.string().trim().min(10).max(5000),
  photos: z.array(z.string().url()).max(8).optional().default([]),
  language: z.enum(['en', 'es', 'fr', 'pt', 'ht']).optional().default('en'),
  prevailing_wage_flag: z.union([z.boolean(), z.string()]).optional().nullable(),
  prevailing_wage_source: z.string().max(50).optional().nullable(),
});

export const Route = createFileRoute("/api/public/intake-submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }}),
      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch (e) {
          return Response.json({ success: false, error: "Invalid form", details: (e as Error).message }, { status: 400 });
        }

        // Fetch contractor including pricing_settings
        const { data: contractor, error: contractorError } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, email, pricing_settings, subscription_tier, license_number, business_address, service_states")
          .eq("slug", input.slug)
          .maybeSingle();
        if (contractorError) console.error("[intake-submit] Contractor lookup failed:", contractorError.message);
        if (!contractor) return Response.json({ success: false, error: "Contractor not found" }, { status: 404 });

        // Credit check — block if limit reached
        const creditResult = await checkAndDeductCredit(
          contractor.id,
          contractor.subscription_tier ?? "apprentice",
          "proposal",
          `Proposal for ${input.client_name}`,
        );
        if (!creditResult.allowed) {
          return Response.json({ success: false, error: creditResult.message ?? "Credit limit reached. Please upgrade your plan." }, { status: 402 });
        }

        // Prevailing-wage risk flag (deterministic, server-side keyword safety net)
        const prevailingWage = evaluatePrevailingWage({
          flag: input.prevailing_wage_flag,
          source: input.prevailing_wage_source,
          jobDescription: input.job_description,
          clientName: input.client_name,
          tradeType: input.trade_type,
        });

        const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 30);

        let created: { id: string; proposal_number: string } | null = null;

        // ── Narrative (prose) verticals: moving, etc. ─────────────────────────
        // Prose document instead of Good/Better/Best. Pricing stored as one labor
        // line so computeTotals yields grandTotal === estimate; render gated by
        // raw_input.proposal_format === "narrative". Falls back to itemized on failure.
        if (isNarrativeTrade(input.trade_type)) {
          const narrative = await generateNarrativeProposal(
            {
              client_name: input.client_name,
              job_address: input.job_address,
              trade_type: input.trade_type,
              job_description: input.job_description,
              language: input.language,
            },
            {
              business_name: contractor.business_name,
              license_number: contractor.license_number,
              service_area: (contractor.service_states || []).join(", ") || contractor.business_address,
            },
          );
          if (narrative) {
            const { data, error } = await supabaseAdmin.from("proposals").insert({
              contractor_id: contractor.id,
              proposal_number: generateProposalNumber(),
              status: "draft",
              source: "public-intake",
              client_name: input.client_name,
              client_email: input.client_email,
              client_phone: input.client_phone,
              job_address: input.job_address || null,
              trade_type: input.trade_type || null,
              job_description: input.job_description,
              scope_of_work: narrative.scope_of_work,
              timeline: narrative.timeline || null,
              warranty: narrative.warranty || null,
              exclusions: [],
              materials: [],
              labor: narrative.estimated_total > 0
                ? [{ task: "Professional moving services", description: "Crew, trucks, transport, protection, and specialty handling as detailed in this proposal.", hours: 1, rate: narrative.estimated_total }]
                : [],
              tiers: {},
              tax_rate: 0,
              payment_terms: narrative.payment_terms,
              photos: input.photos || [],
              language: input.language || 'en',
              valid_through: validThrough.toISOString().slice(0, 10),
              raw_input: { source: "public-intake", slug: input.slug, proposal_format: "narrative", prevailing_wage: prevailingWage as any },
            }).select("id, proposal_number").single();
            if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
            created = data;
          }
        }

        // ── Itemized (Good/Better/Best) path ──────────────────────────────────
        if (!created) {
          const pricing: PricingSettings = mergePricing(contractor.pricing_settings as any);
          const ai = await callGroqAI(input, contractor.business_name, pricing);

          const { data, error } = await supabaseAdmin.from("proposals").insert({
            contractor_id: contractor.id,
            proposal_number: generateProposalNumber(),
            status: "draft",
            source: "public-intake",
            client_name: input.client_name,
            client_email: input.client_email,
            client_phone: input.client_phone,
            job_address: input.job_address || null,
            trade_type: input.trade_type || null,
            job_description: input.job_description,
            scope_of_work: ai?.scope_of_work || input.job_description,
            timeline: ai?.timeline || null,
            warranty: ai?.warranty || pricing.warranty_default,
            exclusions: ai?.exclusions || [],
            materials: ai?.materials || [],
            labor: ai?.labor || [],
            tiers: ai?.tiers || {},
            tax_rate: (ai?.tax_rate ?? pricing.tax_rate) / 100,
            payment_terms: ai?.payment_terms || pricing.payment_terms,
            photos: input.photos || [],
            language: input.language || 'en',
            valid_through: validThrough.toISOString().slice(0, 10),
            raw_input: {
              source: "public-intake",
              slug: input.slug,
              prevailing_wage: prevailingWage as any,
              pricing_used: {
                labor_rate: resolveTradeRate(pricing, input.trade_type).labor_rate,
                material_markup: resolveTradeRate(pricing, input.trade_type).material_markup,
                overhead: resolveTradeRate(pricing, input.trade_type).overhead,
                profit_margin: resolveTradeRate(pricing, input.trade_type).profit_margin,
                tier_spread: pricing.tier_spread,
                tax_rate: pricing.tax_rate,
              },
            },
          }).select("id, proposal_number").single();
          if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
          created = data;
        }

        if (!created) return Response.json({ success: false, error: "Proposal generation failed" }, { status: 500 });

        // Update proposal status to sent
        await supabaseAdmin.from("proposals").update({ status: "sent" }).eq("id", created.id);

        // Auto-send to client
        const origin = new URL(request.url).origin;
        try {
          await fetch(`${origin}/api/public/send-proposal-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposalId: created.id, recipientEmail: input.client_email }),
          });
        } catch (e) { console.warn("intake auto-send failed:", (e as Error).message); }

        // Notify contractor
        if (contractor.email) {
          try {
            await fetch(`${origin}/api/public/send-proposal-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ proposalId: created.id, recipientEmail: contractor.email }),
            });
          } catch (e) { console.warn("intake contractor copy failed:", (e as Error).message); }
        }

        return Response.json({
          success: true,
          proposal_id: created.id,
          proposal_number: created.proposal_number,
          proposal_url: `${origin}/p/${created.id}`,
        });
      },
    },
  },
});
