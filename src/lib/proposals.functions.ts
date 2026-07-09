import { createServerFn } from "@tanstack/react-start";
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
import { generateProposalNumber } from "@/lib/pricing";
import { evaluatePrevailingWage } from "@/lib/prevailing-wage";
import { tradePlaybook } from "@/lib/trade-playbooks";
import { isNarrativeTrade, generateNarrativeProposal } from "@/lib/narrative-proposal.server";
import { checkAndDeductCredit } from "@/lib/credits.server";
import Groq from "groq-sdk";

const aiInput = z.object({
  client_name: z.string().min(1).max(200),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().max(50).optional().nullable(),
  job_address: z.string().max(500).optional().nullable(),
  job_state: z.string().length(2).optional().nullable(),
  trade_type: z.string().max(100).optional().nullable(),
  job_description: z.string().min(1).max(5000),
  prevailing_wage_flag: z.union([z.boolean(), z.string()]).optional().nullable(),
  prevailing_wage_source: z.string().max(50).optional().nullable(),
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
Produce a realistic, professional proposal with itemized materials and labor in USD. Always include a 10% waste factor on flooring and tile quantities. Return ONLY valid JSON matching the schema.`;
  const user = `Job for ${payload.client_name} at ${payload.job_address || "TBD"} (state: ${payload.job_state || "n/a"}).\nDescription: ${payload.job_description}\n\nReturn JSON: { "scope_of_work": string, "timeline": string, "warranty": string, "exclusions": string[], "materials": [{"item":string,"description":string,"qty":number,"unit":string,"retail_price":number,"sia_price":number}], "labor": [{"task":string,"description":string,"hours":number,"rate":number}], "tiers": {"good":{"label":string,"description":string},"better":{"label":string,"description":string},"best":{"label":string,"description":string}} }`;

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
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
    const { userId } = context;
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id, business_name, license_number, business_address, service_states, subscription_tier")
      .eq("user_id", userId).single();
    if (!contractor) throw new Error("Contractor profile not found");

    // Enforce the plan limit (apprentice = 2 lifetime AI actions; journeyman+
    // unlimited proposals). Without this the in-app New Proposal button let any
    // tier generate unlimited proposals for free.
    const credit = await checkAndDeductCredit(
      contractor.id,
      contractor.subscription_tier ?? "apprentice",
      "proposal",
      `Proposal for ${data.client_name}`,
    );
    if (!credit.allowed) {
      throw new Error(credit.message ?? "You've reached your plan limit. Please upgrade to continue.");
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
            job_state: data.job_state,
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
        return { id: created.id, proposal_number: created.proposal_number };
      }
      // Narrative generation failed — fall through to the itemized path below.
    }

    // ── Itemized (Good/Better/Best) path ──────────────────────────────────────
    const ai = await callAI(data);
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
        job_state: data.job_state,
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
        raw_input: { source: "manual", prevailing_wage: prevailingWage as any },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id, proposal_number: created.proposal_number };
  });

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Scope strictly to the signed-in contractor. We resolve the contractor
    // from the validated userId and filter explicitly with the admin client,
    // rather than relying on RLS/token forwarding, so a proposal can never
    // leak across accounts.
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) return [] as Array<Record<string, any> & { view_count: number; last_viewed_at: string | null }>;

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select("id, proposal_number, client_name, client_email, client_phone, status, created_at, job_state, trade_type, materials, labor, tax_rate, selected_tier, language, job_address, raw_input")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return rows.map((r) => ({ ...r, view_count: 0, last_viewed_at: null as string | null }));

    const ids = rows.map((r) => r.id);
    const { data: views } = await supabaseAdmin
      .from("proposal_views")
      .select("proposal_id, viewed_at")
      .in("proposal_id", ids);
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
