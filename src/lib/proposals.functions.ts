import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { generateProposalNumber } from "@/lib/pricing";

const aiInput = z.object({
  client_name: z.string().min(1).max(200),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().max(50).optional().nullable(),
  job_address: z.string().max(500).optional().nullable(),
  job_state: z.string().length(2).optional().nullable(),
  trade_type: z.string().max(100).optional().nullable(),
  job_description: z.string().min(1).max(5000),
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured");

  const sys = `You are an expert contractor estimator for ${payload.trade_type || "general contracting"}. Produce a realistic, professional proposal with itemized materials and labor in USD. Always include a 10% waste factor on flooring and tile quantities. Return ONLY valid JSON matching the schema.`;
  const user = `Job for ${payload.client_name} at ${payload.job_address || "TBD"} (state: ${payload.job_state || "n/a"}).\nDescription: ${payload.job_description}\n\nReturn JSON: { "scope_of_work": string, "timeline": string, "warranty": string, "exclusions": string[], "materials": [{"item":string,"description":string,"qty":number,"unit":string,"retail_price":number,"sia_price":number}], "labor": [{"task":string,"description":string,"hours":number,"rate":number}], "tiers": {"good":{"label":string,"description":string},"better":{"label":string,"description":string},"best":{"label":string,"description":string}} }`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: sys,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const rawContent = json.content?.[0]?.text || "{}";
  // Extract JSON from the response (Claude may wrap it in markdown)
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const content = jsonMatch ? jsonMatch[0] : rawContent;
  return JSON.parse(content) as AIProposalShape;
}

export const generateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => aiInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: contractor } = await supabaseAdmin
      .from("contractors").select("id").eq("user_id", userId).single();
    if (!contractor) throw new Error("Contractor profile not found");

    const ai = await callAI(data);
    const proposalNumber = generateProposalNumber();
    const validThrough = new Date();
    validThrough.setDate(validThrough.getDate() + 30);

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
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id, proposal_number: created.proposal_number };
  });

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("proposals")
      .select("id, proposal_number, client_name, status, created_at, job_state, trade_type")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return rows.map((r) => ({ ...r, view_count: 0, last_viewed_at: null as string | null }));

    const ids = rows.map((r) => r.id);
    const { data: views } = await supabase
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