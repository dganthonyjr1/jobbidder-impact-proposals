import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";

const Body = z.object({
  slug: z.string().min(1).max(120),
  client_name: z.string().trim().min(1).max(200),
  client_email: z.string().trim().email().max(254),
  client_phone: z.string().trim().max(30).optional().default(''),
  job_address: z.string().trim().max(500).optional().nullable(),
  trade_type: z.string().trim().max(100).optional().nullable(),
  job_description: z.string().trim().min(10).max(5000),
  photos: z.array(z.string().url()).max(8).optional().default([]),
});

type AIShape = {
  scope_of_work: string;
  timeline: string;
  warranty: string;
  exclusions: string[];
  materials: { item: string; description?: string; qty: number; unit: string; retail_price: number; sia_price?: number | null }[];
  labor: { task: string; description?: string; hours: number; rate: number }[];
  tiers: Record<string, { label: string; description: string }>;
};

async function callAnthropicAI(payload: z.infer<typeof Body>, business: string): Promise<AIShape | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[intake-submit] ANTHROPIC_API_KEY not set — skipping AI generation");
    return null;
  }
  const sys = `You are an expert estimator for ${business} (${payload.trade_type || "general contracting"}). Produce a realistic, professional proposal with itemized materials and labor in USD. Apply a 10% waste factor on flooring/tile/paint/drywall. Return ONLY valid JSON with no markdown fences.`;
  const user = `CLIENT: ${payload.client_name}\nADDRESS: ${payload.job_address || "TBD"}\nDESCRIPTION: ${payload.job_description}\n\nReturn JSON: {"scope_of_work":string,"timeline":string,"warranty":string,"exclusions":string[],"materials":[{"item":string,"description":string,"qty":number,"unit":string,"retail_price":number,"sia_price":number}],"labor":[{"task":string,"description":string,"hours":number,"rate":number}],"tiers":{"good":{"label":"Good","description":string},"better":{"label":"Better","description":string},"best":{"label":"Best","description":string}}}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[intake-submit] Anthropic API error:", res.status, errText);
      return null;
    }
    const json = await res.json();
    const raw = json?.content?.[0]?.text || "{}";
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return JSON.parse(cleaned) as AIShape;
  } catch (e) {
    console.error("[intake-submit] Anthropic call failed:", (e as Error).message);
    return null;
  }
}

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

        const { data: contractor } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, email")
          .eq("slug", input.slug)
          .maybeSingle();
        if (!contractor) return Response.json({ success: false, error: "Contractor not found" }, { status: 404 });

        const ai = await callAnthropicAI(input, contractor.business_name);

        const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 30);
        const { data: created, error } = await supabaseAdmin.from("proposals").insert({
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
          warranty: ai?.warranty || null,
          exclusions: ai?.exclusions || [],
          materials: ai?.materials || [],
          labor: ai?.labor || [],
          tiers: ai?.tiers || {},
          photos: input.photos || [],
          valid_through: validThrough.toISOString().slice(0, 10),
          raw_input: { source: "public-intake", slug: input.slug },
        }).select("id, proposal_number").single();
        if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

        // Auto-send to client (this also schedules follow-ups via the email route)
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
