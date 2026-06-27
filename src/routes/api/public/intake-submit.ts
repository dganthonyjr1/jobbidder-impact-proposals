import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";
import { checkAndDeductCredit } from "@/lib/credits.server";
import Groq from "groq-sdk";

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
});

type AIShape = {
  scope_of_work: string;
  timeline: string;
  warranty: string;
  exclusions: string[];
  materials: { item: string; description?: string; qty: number; unit: string; retail_price: number; sia_price?: number | null }[];
  labor: { task: string; description?: string; hours: number; rate: number }[];
  tiers: Record<string, { label: string; description: string }>;
  tax_rate: number;
  payment_terms: string;
};

interface TradeRate {
  labor_rate: number;
  material_markup: number;
  overhead: number;
  profit_margin: number;
}

interface PricingSettings {
  trades: Record<string, TradeRate>;
  tier_spread: { good: number; better: number; best: number };
  tax_rate: number;
  payment_terms: string;
  warranty_default: string;
}

const DEFAULT_PRICING: PricingSettings = {
  trades: {
    default: { labor_rate: 65, material_markup: 35, overhead: 12, profit_margin: 20 },
  },
  tier_spread: { good: 0, better: 18, best: 38 },
  tax_rate: 7,
  payment_terms: "50% deposit, 50% on completion",
  warranty_default: "1-year workmanship warranty on all labor",
};

/**
 * Resolve the best trade rate for the given trade type string.
 * Tries an exact key match, then a fuzzy keyword match, then falls back to default.
 */
function resolveTradeRate(pricing: PricingSettings, tradeType: string | null | undefined): TradeRate {
  if (!tradeType) return pricing.trades.default || DEFAULT_PRICING.trades.default;
  const lower = tradeType.toLowerCase();
  // Exact key match
  if (pricing.trades[lower]) return pricing.trades[lower];
  // Fuzzy keyword match
  const keywords: Record<string, string> = {
    roof: "roofing", hvac: "hvac", heat: "hvac", cool: "hvac", air: "hvac",
    plumb: "plumbing", water: "plumbing", drain: "plumbing",
    electric: "electrical", wiring: "electrical",
    remodel: "remodeling", general: "remodeling", kitchen: "remodeling", bath: "remodeling",
    paint: "painting",
    floor: "flooring", tile: "flooring", carpet: "flooring",
    landscape: "landscaping", lawn: "landscaping", yard: "landscaping",
  };
  for (const [kw, tradeKey] of Object.entries(keywords)) {
    if (lower.includes(kw) && pricing.trades[tradeKey]) return pricing.trades[tradeKey];
  }
  return pricing.trades.default || DEFAULT_PRICING.trades.default;
}

/**
 * Build the system and user prompts for Claude, injecting the contractor's
 * actual pricing parameters so the AI uses real numbers instead of estimates.
 */
function buildPrompt(
  payload: z.infer<typeof Body>,
  business: string,
  pricing: PricingSettings
): { system: string; user: string } {
  const rate = resolveTradeRate(pricing, payload.trade_type);
  const { tier_spread, tax_rate, payment_terms, warranty_default } = pricing;

  const LANG_NAMES: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', ht: 'Haitian Creole' };
  const langName = LANG_NAMES[payload.language || 'en'] || 'English';

  const system = `You are an expert estimator for ${business} (${payload.trade_type || "general contracting"}).

LANGUAGE: Write ALL text fields (scope_of_work, timeline, warranty, exclusions, tier descriptions, payment_terms, item names, task names, descriptions) in ${langName}. Numbers and JSON keys stay in English/numeric format.

PRICING PARAMETERS — use these exact numbers, do not estimate:
- Labor rate: $${rate.labor_rate}/hr
- Material markup over wholesale cost: ${rate.material_markup}%
- Overhead factor: ${rate.overhead}% of (materials + labor)
- Profit margin: ${rate.profit_margin}% applied after overhead
- Tax rate: ${tax_rate}%
- Payment terms: ${payment_terms}
- Default warranty: ${warranty_default}

TIER PRICING RULES:
- Good tier: base price (0% premium) — standard materials, meets code
- Better tier: base price + ${tier_spread.better}% — upgraded materials, enhanced scope
- Best tier: base price + ${tier_spread.best}% — premium materials, full-service scope

CALCULATION METHOD:
1. List all materials with wholesale (sia_price) and retail price. Apply ${rate.material_markup}% markup to get the billed material cost.
2. List all labor tasks with hours and rate of $${rate.labor_rate}/hr.
3. The AI does NOT calculate totals — the frontend calculates totals from the line items.
4. Apply a 10% waste factor on flooring, tile, paint, and drywall quantities.
5. The tiers field describes what changes between Good/Better/Best — the frontend applies the tier spread percentages to the base total.

Return ONLY valid JSON with no markdown fences.`;

  const user = `CLIENT: ${payload.client_name}
ADDRESS: ${payload.job_address || "TBD"}
TRADE: ${payload.trade_type || "General Contracting"}
DESCRIPTION: ${payload.job_description}

Return JSON:
{
  "scope_of_work": string,
  "timeline": string,
  "warranty": string,
  "exclusions": string[],
  "materials": [{"item": string, "description": string, "qty": number, "unit": string, "retail_price": number, "sia_price": number}],
  "labor": [{"task": string, "description": string, "hours": number, "rate": number}],
  "tiers": {
    "good": {"label": "Good", "description": string},
    "better": {"label": "Better", "description": string},
    "best": {"label": "Best", "description": string}
  },
  // Note: label values must stay as "Good", "Better", "Best" (English) — only description should be in ${langName}
  "tax_rate": ${tax_rate},
  "payment_terms": "${payment_terms}"
}`;

  return { system, user };
}

async function callGroqAI(
  payload: z.infer<typeof Body>,
  business: string,
  pricing: PricingSettings
): Promise<AIShape | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[intake-submit] GROQ_API_KEY not set — skipping AI generation");
    return null;
  }

  const { system, user } = buildPrompt(payload, business, pricing);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return JSON.parse(cleaned) as AIShape;
  } catch (e) {
    console.error("[intake-submit] Groq call failed:", (e as Error).message);
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

        // Fetch contractor including pricing_settings
        const { data: contractor } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, email, pricing_settings, subscription_tier")
          .eq("slug", input.slug)
          .maybeSingle();
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

        // Merge contractor pricing with defaults
        const pricing: PricingSettings = contractor.pricing_settings
          ? { ...DEFAULT_PRICING, ...contractor.pricing_settings, trades: { ...DEFAULT_PRICING.trades, ...contractor.pricing_settings.trades } }
          : DEFAULT_PRICING;

        const ai = await callGroqAI(input, contractor.business_name, pricing);

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
