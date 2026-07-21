import type { MaterialLine } from "@/lib/pricing";
import { normalizeTradeKey } from "@/lib/trade-playbooks";

/**
 * Catalog-based pricing.
 *
 * The AI still identifies scope and quantities, but instead of trusting the
 * price it invents for each line, we look the item up in a unit-cost catalog
 * (contractor's own rows first, then platform-global seed rows) and replace the
 * price with a real, deterministic unit cost. Items with no catalog match keep
 * the AI's estimate, so this is strictly additive: with an empty catalog nothing
 * changes, and every catalog row makes the estimate more defensible.
 *
 * This is the accuracy foundation — an LLM guessing "$1.35/sqft" is the ceiling
 * on trust; a real $/unit the contractor can point to is the floor of a product
 * they'll pay for. The matching + application logic here is pure and unit-tested;
 * only fetchCatalog touches the database.
 */

export interface CatalogRow {
  id: string;
  contractor_id: string | null;
  trade: string;
  item_key: string;
  name: string;
  unit: string;
  unit_cost: number;
  retail_unit_cost: number | null;
  region: string | null;
  aliases: string[];
}

export interface CatalogCoverage {
  total: number;
  matched: number;
  ratio: number; // 0..1
  priced_from_catalog: string[]; // names of items priced from the catalog
  source: "cost_catalog";
}

export interface CatalogPricingResult {
  materials: MaterialLine[];
  coverage: CatalogCoverage;
}

/** Is catalog pricing turned on? Global env kill-switch OR per-contractor pilot. */
export function isCostCatalogEnabled(contractor?: { pricing_settings?: unknown } | null): boolean {
  if (process.env.COST_CATALOG_ENABLED === "true") return true;
  const ps = contractor?.pricing_settings as { use_cost_catalog?: boolean } | undefined;
  return ps?.use_cost_catalog === true;
}

/** Lowercase, strip punctuation, collapse whitespace — for fuzzy substring matching. */
function normalizeText(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the best catalog row for a free-text line item.
 *
 * Scores each row by the longest alias/name/key that appears in the item text,
 * boosting contractor-owned rows over global ones and region-matched rows over
 * national defaults. Rows for a different region than requested are skipped.
 */
export function matchCatalogRow(
  itemText: string,
  rows: CatalogRow[],
  opts: { region?: string | null } = {},
): CatalogRow | null {
  const haystack = normalizeText(itemText);
  if (!haystack) return null;
  const region = opts.region ? opts.region.toLowerCase() : null;

  let best: CatalogRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    // Region-specific rows only apply to their region; null-region = national.
    if (row.region && region && row.region.toLowerCase() !== region) continue;

    const candidates = [row.name, row.item_key.replace(/_/g, " "), ...(row.aliases || [])];
    for (const cand of candidates) {
      const c = normalizeText(cand);
      if (c.length < 3) continue; // avoid trivial matches
      // whole-token containment either direction (handles "gutter" vs "gutters run")
      if (!haystack.includes(c)) continue;
      const score =
        c.length +
        (row.contractor_id ? 1000 : 0) +
        (row.region && region && row.region.toLowerCase() === region ? 500 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }
  return best;
}

/**
 * Replace AI-guessed material prices with catalog unit costs where a match
 * exists. Quantities and units stay as the AI produced them; unmatched items are
 * returned unchanged (AI price preserved). Returns coverage stats for auditing.
 */
export function applyCatalogPricing(
  materials: MaterialLine[],
  rows: CatalogRow[],
  opts: { region?: string | null } = {},
): CatalogPricingResult {
  const priced_from_catalog: string[] = [];

  const out = (materials || []).map((m) => {
    const match = matchCatalogRow(`${m.item || ""} ${m.description || ""}`, rows, opts);
    if (!match) return m;
    priced_from_catalog.push(m.item);
    return {
      ...m,
      sia_price: match.unit_cost,
      retail_price: match.retail_unit_cost ?? m.retail_price ?? match.unit_cost,
      catalog_id: match.id,
    } as MaterialLine;
  });

  const total = out.length;
  const matched = priced_from_catalog.length;
  return {
    materials: out,
    coverage: {
      total,
      matched,
      ratio: total > 0 ? matched / total : 0,
      priced_from_catalog,
      source: "cost_catalog",
    },
  };
}

/**
 * Load the applicable catalog rows for a trade: platform-global rows plus this
 * contractor's own overrides. Returns [] on any error so pricing simply falls
 * back to the AI estimate — catalog problems must never break generation.
 *
 * `client` is typed loosely (the Supabase admin client) on purpose: importing
 * its full generic type here makes TS's structural check blow up (TS2589), and
 * the query below is trivial, so the deep typing buys no real safety.
 */
export async function fetchCatalog(
  client: any,
  opts: { trade?: string | null; contractorId: string },
): Promise<CatalogRow[]> {
  const trade = normalizeTradeKey(opts.trade);
  try {
    const { data, error } = await client
      .from("cost_catalog")
      .select("id, contractor_id, trade, item_key, name, unit, unit_cost, retail_unit_cost, region, aliases")
      .eq("trade", trade)
      .eq("active", true)
      .or(`contractor_id.is.null,contractor_id.eq.${opts.contractorId}`);
    if (error) {
      console.error("[cost-catalog] fetch failed:", error.message);
      return [];
    }
    return (data || []) as CatalogRow[];
  } catch (e) {
    console.error("[cost-catalog] fetch threw:", (e as Error).message);
    return [];
  }
}
