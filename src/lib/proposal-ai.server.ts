import Groq from "groq-sdk";
import { tradePlaybook } from "./trade-playbooks";

/**
 * Shared proposal-generation logic used by both:
 *  - /api/public/intake-submit            (creates a brand-new proposal)
 *  - /api/public/webhook/ghl-voice-update-estimate (regenerates an existing one)
 *
 * Keeping the pricing model + AI prompt in one place guarantees that an
 * updated proposal is priced and worded exactly like a freshly created one.
 */

export interface TradeRate {
  labor_rate: number;
  material_markup: number;
  overhead: number;
  profit_margin: number;
}

export interface PricingSettings {
  trades: Record<string, TradeRate>;
  tier_spread: { good: number; better: number; best: number };
  tax_rate: number;
  payment_terms: string;
  warranty_default: string;
}

export type AIShape = {
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

/** Minimal shape needed to generate a proposal — satisfied by both intake input and an existing proposal row. */
export interface ProposalAIInput {
  client_name: string;
  job_address?: string | null;
  trade_type?: string | null;
  job_description: string;
  language?: string | null;
}

export const DEFAULT_PRICING: PricingSettings = {
  trades: {
    default: { labor_rate: 65, material_markup: 35, overhead: 12, profit_margin: 20 },
  },
  tier_spread: { good: 0, better: 18, best: 38 },
  tax_rate: 7,
  payment_terms: "50% deposit, 50% on completion",
  warranty_default: "1-year workmanship warranty on all labor",
};

/** Merge a contractor's stored pricing_settings over the platform defaults. */
export function mergePricing(rawPricing: any): PricingSettings {
  return rawPricing
    ? { ...DEFAULT_PRICING, ...rawPricing, trades: { ...DEFAULT_PRICING.trades, ...rawPricing.trades } }
    : DEFAULT_PRICING;
}

/**
 * Resolve the best trade rate for the given trade type string.
 * Tries an exact key match, then a fuzzy keyword match, then falls back to default.
 */
export function resolveTradeRate(pricing: PricingSettings, tradeType: string | null | undefined): TradeRate {
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
 * Build the system and user prompts for the AI, injecting the contractor's
 * actual pricing parameters so the AI uses real numbers instead of estimates.
 */
export function buildPrompt(
  input: ProposalAIInput,
  business: string,
  pricing: PricingSettings
): { system: string; user: string } {
  const rate = resolveTradeRate(pricing, input.trade_type);
  const { tier_spread, tax_rate, payment_terms, warranty_default } = pricing;

  const LANG_NAMES: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', ht: 'Haitian Creole' };
  const langName = LANG_NAMES[input.language || 'en'] || 'English';

  const system = `You are an expert estimator for ${business} (${input.trade_type || "general contracting"}).

TRADE-SPECIFIC GUIDANCE — build the estimate the way a real ${input.trade_type || "contractor"} would, using the appropriate materials, labor phases, units, and considerations:
${tradePlaybook(input.trade_type)}

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

  const user = `CLIENT: ${input.client_name}
ADDRESS: ${input.job_address || "TBD"}
TRADE: ${input.trade_type || "General Contracting"}
DESCRIPTION: ${input.job_description}

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

export async function callGroqAI(
  input: ProposalAIInput,
  business: string,
  pricing: PricingSettings
): Promise<AIShape | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[proposal-ai] GROQ_API_KEY not set — skipping AI generation");
    return null;
  }

  const { system, user } = buildPrompt(input, business, pricing);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      // Output-side truncation guard — see proposals.functions.ts callAI. A full
      // multi-system spec can emit 30+ line items; at 4096 the JSON reply was
      // cut off mid-list, dropping scope and lowballing the total. 8192 gives
      // room to price every system. (llama-3.3-70b allows up to 32768.)
      max_tokens: 8192,
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
    console.error("[proposal-ai] Groq call failed:", (e as Error).message);
    return null;
  }
}
