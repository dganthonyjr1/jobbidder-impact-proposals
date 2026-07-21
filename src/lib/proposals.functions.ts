import { createServerFn } from "@tanstack/react-start";
import { checkAndDeductCredit } from "@/lib/credits.server";
/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary multi-tier proposal generation logic
 * protected by:
 * - U.S. Patent Application (Provisional) - June 23, 2026
 * - Copyright Law
 * - Trade Secret Protection
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { computeTotals, generateProposalNumber, JOB_DESCRIPTION_MAX_LENGTH } from "@/lib/pricing";
import { evaluatePrevailingWage } from "@/lib/prevailing-wage";
import { tradePlaybook, normalizeTradeKey, defaultOverheadForTrade } from "@/lib/trade-playbooks";
import { isNarrativeTrade, generateNarrativeProposal } from "@/lib/narrative-proposal.server";
import { verifyScopeCompleteness } from "@/lib/scope-completeness";
import { syncNewProposalToHubspot, type HubspotCredentials } from "@/lib/hubspot.server";
import { syncNewProposalToNetsuite, type NetsuiteCredentials } from "@/lib/netsuite.server";
import Groq from "groq-sdk";

async function getHubspotCredentials(contractorId: string): Promise<HubspotCredentials | null> {
  const { data } = await supabaseAdmin
    .from("contractor_integrations")
    .select("hubspot_private_app_token, hubspot_sync_enabled")
    .eq("contractor_id", contractorId)
    .maybeSingle();
  if (!data) return null;
  return { privateAppToken: data.hubspot_private_app_token, syncEnabled: data.hubspot_sync_enabled };
}

// Dark/untested — see src/lib/netsuite.server.ts. netsuite_sync_enabled is not
// exposed in Settings yet, so this stays inert until it's set directly in the
// database after a live test against a real NetSuite account.
async function getNetsuiteCredentials(contractorId: string): Promise<NetsuiteCredentials | null> {
  const { data } = await supabaseAdmin
    .from("contractor_integrations")
    .select("netsuite_account_id, netsuite_consumer_key, netsuite_consumer_secret, netsuite_token_id, netsuite_token_secret, netsuite_sync_enabled")
    .eq("contractor_id", contractorId)
    .maybeSingle();
  if (!data) return null;
  return {
    accountId: data.netsuite_account_id,
    consumerKey: data.netsuite_consumer_key,
    consumerSecret: data.netsuite_consumer_secret,
    tokenId: data.netsuite_token_id,
    tokenSecret: data.netsuite_token_secret,
    syncEnabled: data.netsuite_sync_enabled,
  };
}

const extractedSystemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  unit_hint: z.string().max(50).optional().default(""),
});

const aiInput = z.object({
  client_name: z.string().min(1).max(200),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().max(50).optional().nullable(),
  job_address: z.string().max(500).optional().nullable(),
  job_address2: z.string().trim().max(200).optional().nullable(),
  job_city: z.string().trim().max(100).optional().nullable(),
  job_state: z.string().length(2).optional().nullable(),
  job_zip: z.union([z.literal(""), z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid zip code")]).optional().nullable(),
  trade_type: z.string().max(100).optional().nullable(),
  job_description: z.string().min(1).max(JOB_DESCRIPTION_MAX_LENGTH),
  prevailing_wage_flag: z.union([z.boolean(), z.string()]).optional().nullable(),
  prevailing_wage_source: z.string().max(50).optional().nullable(),
  extracted_systems: z.array(extractedSystemSchema).max(50).optional(),
});

type AIProposalShape = {
  scope_of_work: string;
  timeline: string;
  warranty: string;
  exclusions: string[];
  materials: { item: string; description?: string; qty: number; unit: string; retail_price: number; sia_price?: number | null }[];
  labor: { task: string; description?: string; hours: number; rate: number }[];
  tiers: { good: { label: string; description: string }; better: { label: string; description: string }; best: { label: string; description: string } };
};

async function callAI(payload: z.infer<typeof aiInput>): Promise<AIProposalShape> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured — GROQ_API_KEY missing");

  const sys = `You are an expert contractor estimator for ${payload.trade_type || "general contracting"}. Build the estimate the way a real ${payload.trade_type || "contractor"} would — using the right materials, labor phases, units, and considerations for this trade:
${tradePlaybook(payload.trade_type)}
Produce a realistic, professional proposal with itemized materials and labor in USD. Always include a 10% waste factor on flooring and tile quantities.${payload.extracted_systems?.length ? " The scope below was extracted from an uploaded spec document and lists every distinct system that must be priced — price EVERY system listed, each with its own materials and labor line items. Do not drop, skip, or merge any of them into a single catch-all line." : ""} Return ONLY valid JSON matching the schema.`;
  const systemsBlock = payload.extracted_systems?.length
    ? `\n\nSystems to price (from the uploaded spec — include every one):\n${payload.extracted_systems.map((s, i) => `${i + 1}. ${s.name}${s.unit_hint ? ` (unit: ${s.unit_hint})` : ""} — ${s.description || "see job description for scope"}`).join("\n")}`
    : "";
  const user = `Job for ${payload.client_name} at ${payload.job_address || "TBD"} (state: ${payload.job_state || "n/a"}).\nDescription: ${payload.job_description}${systemsBlock}\n\nReturn JSON: { "scope_of_work": string, "timeline": string, "warranty": string, "exclusions": string[], "materials": [{"item":string,"description":string,"qty":number,"unit":string,"retail_price":number,"sia_price":number}], "labor": [{"task":string,"description":string,"hours":number,"rate":number}], "tiers": {"good":{"label":string,"description":string},"better":{"label":string,"description":string},"best":{"label":string,"description":string}} }`;

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    // Output-side truncation guard: a full multi-system spec (roof membrane,
    // canopy, gutters, downspouts, drip edge, flashing, insulation, labor
    // phases…) can emit 30+ line items. At 4096 the JSON reply was getting cut
    // off mid-list, silently dropping scope and lowballing the total. 8192 gives
    // the model room to price every system. (llama-3.3-70b allows up to 32768.)
    max_tokens: 8192,
    temperature: 0.3,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const content = jsonMatch ? jsonMatch[0] : cleaned;
  return JSON.parse(content) as AIProposalShape;
}

export const generateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => aiInput.parse(input))
  .handler(async ({ data, context }) => {
    console.log(`[generateProposal] extracted_systems received: ${data.extracted_systems?.length ?? 0}${data.extracted_systems?.length ? ` (${data.extracted_systems.map((s) => s.name).join(", ")})` : ""}`);
    const { userId } = context;
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from("contractors")
      .select("id, business_name, license_number, business_address, service_states, subscription_tier, pricing_settings")
      .eq("user_id", userId).single();
    if (contractorError || !contractor) {
      console.error("[generateProposal] contractor lookup failed:", contractorError);
      throw new Error(`Contractor profile not found: ${contractorError?.message ?? "no row for user " + userId}`);
    }

// Single source of truth for plan limits: ledger + packs + overage.
    // Do NOT hand-count the proposals table here — it can't see purchased packs.
    const creditResult = await checkAndDeductCredit(
      contractor.id,
      contractor.subscription_tier ?? "apprentice",
      "proposal",
      `Proposal for ${data.client_name}`,
    );
    if (!creditResult.allowed) {
      throw new Error(creditResult.message ?? "Plan limit reached. Please upgrade or purchase a proposal pack.");
    }    
    

    const prevailingWage = evaluatePrevailingWage({
      flag: data.prevailing_wage_flag,
      source: data.prevailing_wage_source,
      jobDescription: data.job_description,
      clientName: data.client_name,
      state: data.job_state,
      tradeType: data.trade_type,
    });
    const proposalNumber = generateProposalNumber();
    const validThrough = new Date();
    validThrough.setDate(validThrough.getDate() + 30);

    // ── Narrative (prose) verticals: moving, etc. ─────────────────────────────
    // Prose document instead of a Good/Better/Best materials table. Pricing is a
    // single labor line so computeTotals yields grandTotal === estimate exactly,
    // keeping the accept/deposit money path unchanged. Gated for render by
    // raw_input.proposal_format === "narrative".
    if (isNarrativeTrade(data.trade_type)) {
      const narrative = await generateNarrativeProposal(
        {
          client_name: data.client_name,
          job_address: data.job_address,
          trade_type: data.trade_type,
          job_description: data.job_description,
        },
        {
          business_name: contractor.business_name,
          license_number: contractor.license_number,
          service_area: (contractor.service_states || []).join(", ") || contractor.business_address,
        },
      );
      if (narrative) {
        const { data: created, error } = await supabaseAdmin
          .from("proposals")
          .insert({
            contractor_id: contractor.id,
            proposal_number: proposalNumber,
            status: "draft",
            client_name: data.client_name,
            client_email: data.client_email,
            client_phone: data.client_phone,
            job_address: data.job_address,
            job_address2: data.job_address2 || null,
            job_city: data.job_city || null,
            job_state: data.job_state,
            job_zip: data.job_zip || null,
            job_description: data.job_description,
            trade_type: data.trade_type,
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
            valid_through: validThrough.toISOString().slice(0, 10),
            source: "manual",
            raw_input: { source: "manual", proposal_format: "narrative", prevailing_wage: prevailingWage as any },
          })
          .select()
          .single();
        if (error) throw new Error(error.message);

        try {
          const hubspotCreds = await getHubspotCredentials(contractor.id);
          const dealId = await syncNewProposalToHubspot({
            clientName: data.client_name,
            clientEmail: data.client_email,
            clientPhone: data.client_phone,
            dealName: `Proposal ${created.proposal_number} — ${data.client_name}`,
            amount: narrative.estimated_total || null,
            credentials: hubspotCreds,
          });
          if (dealId) await supabaseAdmin.from("proposals").update({ hubspot_deal_id: dealId }).eq("id", created.id);
        } catch (e) {
          console.error("[generateProposal] HubSpot sync failed:", (e as Error).message);
        }

        try {
          const netsuiteCreds = await getNetsuiteCredentials(contractor.id);
          const opportunityId = await syncNewProposalToNetsuite({
            clientName: data.client_name,
            clientEmail: data.client_email,
            clientPhone: data.client_phone,
            dealTitle: `Proposal ${created.proposal_number} — ${data.client_name}`,
            memo: narrative.estimated_total > 0 ? `Estimated total: $${narrative.estimated_total}` : null,
            credentials: netsuiteCreds,
          });
          if (opportunityId) await supabaseAdmin.from("proposals").update({ netsuite_deal_id: opportunityId }).eq("id", created.id);
        } catch (e) {
          console.error("[generateProposal] NetSuite sync failed:", (e as Error).message);
        }

        return { id: created.id, proposal_number: created.proposal_number };
      }
      // Narrative generation failed — fall through to the itemized path below.
    }

    // ── Itemized (Good/Better/Best) path ──────────────────────────────────────
    const ai = await callAI(data);

    // Scope-completeness guard: make sure every scope item named in the input
    // (and any spec systems extracted from an uploaded PDF) actually got priced.
    // If the model forgot the canopy, gutters, drip edge, etc., flag it loudly
    // instead of returning a confident low number.
    const scopeCheck = verifyScopeCompleteness(
      data.job_description,
      ai.materials || [],
      ai.labor || [],
      data.extracted_systems || [],
    );
    if (!scopeCheck.complete) {
      console.warn(`[generateProposal] scope-completeness warning — missing: ${scopeCheck.missing.join(", ")}`);
    }

    // P3: pull the contractor's per-trade overhead. Prefer their configured
    // per-trade value, then their default, then a realistic trade-aware default
    // (roofing/commercial carry far more overhead than the flat 12% — see
    // defaultOverheadForTrade). Then compute a snapshot dollar amount off the
    // base (unmultiplied) materials + labor totals.
    const tradeSettings = (contractor.pricing_settings as any)?.trades || {};
    const tradeKey = normalizeTradeKey(data.trade_type);
    const overheadPercentage = Number(
      tradeSettings[tradeKey]?.overhead ?? tradeSettings.default?.overhead ?? defaultOverheadForTrade(data.trade_type),
    );
    const baseTotals = computeTotals((ai.materials || []) as any, ai.labor || [], "better", 0.07, overheadPercentage);

    const { data: created, error } = await supabaseAdmin
      .from("proposals")
      .insert({
        contractor_id: contractor.id,
        proposal_number: proposalNumber,
        status: "draft",
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        job_address: data.job_address,
        job_address2: data.job_address2 || null,
        job_city: data.job_city || null,
        job_state: data.job_state,
        job_zip: data.job_zip || null,
        job_description: data.job_description,
        trade_type: data.trade_type,
        scope_of_work: ai.scope_of_work,
        timeline: ai.timeline,
        warranty: ai.warranty,
        exclusions: ai.exclusions || [],
        materials: ai.materials || [],
        labor: ai.labor || [],
        tiers: ai.tiers || {},
        valid_through: validThrough.toISOString().slice(0, 10),
        source: "manual",
        overhead_percentage: overheadPercentage,
        overhead_amount: baseTotals.overheadAmount,
        overhead_source: "contractor_default",
        raw_input: {
          source: "manual",
          prevailing_wage: prevailingWage as any,
          ...(data.extracted_systems?.length ? { extracted_systems: data.extracted_systems } : {}),
          ...(scopeCheck.complete ? {} : { scope_check: { missing: scopeCheck.missing, message: scopeCheck.message } }),
        },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    try {
      const hubspotCreds = await getHubspotCredentials(contractor.id);
      const dealId = await syncNewProposalToHubspot({
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        dealName: `Proposal ${created.proposal_number} — ${data.client_name}`,
        amount: baseTotals.grandTotal || null,
        credentials: hubspotCreds,
      });
      if (dealId) await supabaseAdmin.from("proposals").update({ hubspot_deal_id: dealId }).eq("id", created.id);
    } catch (e) {
      console.error("[generateProposal] HubSpot sync failed:", (e as Error).message);
    }

    try {
      const netsuiteCreds = await getNetsuiteCredentials(contractor.id);
      const opportunityId = await syncNewProposalToNetsuite({
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        dealTitle: `Proposal ${created.proposal_number} — ${data.client_name}`,
        memo: baseTotals.grandTotal > 0 ? `Estimated total: $${baseTotals.grandTotal.toFixed(2)}` : null,
        credentials: netsuiteCreds,
      });
      if (opportunityId) await supabaseAdmin.from("proposals").update({ netsuite_deal_id: opportunityId }).eq("id", created.id);
    } catch (e) {
      console.error("[generateProposal] NetSuite sync failed:", (e as Error).message);
    }

    return { id: created.id, proposal_number: created.proposal_number };
  });

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Get contractor_id for this user to filter proposals
    const { data: contractor, error: contractorError } = await supabase
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (contractorError) throw new Error(contractorError.message);
    if (!contractor) return []; // User has no contractor, return empty
    
    const { data, error } = await supabase
      .from("proposals")
      .select("id, proposal_number, client_name, client_email, client_phone, status, created_at, job_state, job_city, job_zip, job_address2, trade_type, materials, labor, tax_rate, overhead_percentage, selected_tier, language, job_address, raw_input")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const { data: views, error: viewsError } = await supabase
      .from("proposal_views")
      .select("proposal_id, viewed_at")
      .in("proposal_id", ids);
    if (viewsError) console.error("[proposals.functions] Proposal views lookup failed:", viewsError.message);
    const stats = new Map<string, { count: number; last: string | null }>();
    for (const v of views ?? []) {
      const s = stats.get(v.proposal_id) || { count: 0, last: null };
      s.count += 1;
      if (!s.last || v.viewed_at > s.last) s.last = v.viewed_at;
      stats.set(v.proposal_id, s);
    }
    return rows.map((r) => {
      const s = stats.get(r.id);
      return { ...r, view_count: s?.count ?? 0, last_viewed_at: s?.last ?? null };
    });
  });
