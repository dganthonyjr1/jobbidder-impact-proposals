/**
 * Prevailing Wage — Phase 2: wage-rate reference + lookup.
 *
 * IMPORTANT: these are REFERENCE ESTIMATES, not official determinations. The
 * U.S. DOL publishes Davis-Bacon wage determinations per county/trade as
 * datasets on SAM.gov — there is no free "rate for this trade in this county"
 * API. This table gives a usable statewide baseline so the system can surface
 * an approximate legal-minimum labor rate on flagged jobs; it is meant to be
 * overridden by official determinations (or a paid feed) as those are added.
 *
 * Rates are USD/hour: base wage + fringe. total = base + fringe.
 */

export interface PrevailingWageRate {
  trade: string;      // normalized trade key
  tradeLabel: string; // human label
  state: string;
  base: number;
  fringe: number;
  total: number;
  source: "reference-estimate";
}

const TRADE_LABELS: Record<string, string> = {
  glazing: "Glazier",
  roofing: "Roofer",
  hvac: "HVAC / Sheet Metal Worker",
  plumbing: "Plumber",
  electrical: "Electrician",
  painting: "Painter",
  flooring: "Floor Layer",
  construction: "Construction Craft Laborer",
  laborer: "Construction Craft Laborer",
};

/** Map a free-text trade_type to a normalized key. */
function normalizeTrade(tradeType: string | null | undefined): string {
  const t = (tradeType || "").toLowerCase();
  if (!t) return "construction";
  const map: Array<[RegExp, string]> = [
    [/glaz|glass|window film|curtain wall|storefront/, "glazing"],
    [/roof/, "roofing"],
    [/hvac|heat|cool|air|sheet metal/, "hvac"],
    [/plumb|pipe|drain/, "plumbing"],
    [/electric|wiring|electrical/, "electrical"],
    [/paint/, "painting"],
    [/floor|tile|carpet/, "flooring"],
  ];
  for (const [re, key] of map) if (re.test(t)) return key;
  return "construction";
}

// Statewide baseline base/fringe by trade. DEFAULT covers states not listed.
// (Illustrative reference values — replace with official determinations.)
const RATES: Record<string, Record<string, { base: number; fringe: number }>> = {
  CA: {
    glazing: { base: 48, fringe: 28 }, roofing: { base: 42, fringe: 22 }, hvac: { base: 50, fringe: 30 },
    plumbing: { base: 55, fringe: 34 }, electrical: { base: 56, fringe: 35 }, painting: { base: 40, fringe: 24 },
    flooring: { base: 44, fringe: 26 }, construction: { base: 38, fringe: 22 },
  },
  NV: {
    glazing: { base: 40, fringe: 20 }, roofing: { base: 34, fringe: 16 }, hvac: { base: 42, fringe: 22 },
    plumbing: { base: 46, fringe: 26 }, electrical: { base: 47, fringe: 27 }, painting: { base: 33, fringe: 17 },
    flooring: { base: 36, fringe: 18 }, construction: { base: 31, fringe: 16 },
  },
  AZ: {
    glazing: { base: 34, fringe: 15 }, roofing: { base: 28, fringe: 11 }, hvac: { base: 35, fringe: 16 },
    plumbing: { base: 38, fringe: 18 }, electrical: { base: 39, fringe: 19 }, painting: { base: 27, fringe: 11 },
    flooring: { base: 30, fringe: 13 }, construction: { base: 25, fringe: 10 },
  },
  TX: {
    glazing: { base: 32, fringe: 13 }, roofing: { base: 26, fringe: 9 }, hvac: { base: 33, fringe: 14 },
    plumbing: { base: 36, fringe: 16 }, electrical: { base: 37, fringe: 17 }, painting: { base: 25, fringe: 9 },
    flooring: { base: 28, fringe: 11 }, construction: { base: 23, fringe: 9 },
  },
  DEFAULT: {
    glazing: { base: 36, fringe: 18 }, roofing: { base: 30, fringe: 14 }, hvac: { base: 38, fringe: 19 },
    plumbing: { base: 42, fringe: 22 }, electrical: { base: 43, fringe: 23 }, painting: { base: 29, fringe: 14 },
    flooring: { base: 32, fringe: 16 }, construction: { base: 27, fringe: 13 },
  },
};

/** Look up an approximate prevailing wage for a state + trade. Returns null if state/trade unknown. */
export function lookupPrevailingWage(state: string | null | undefined, tradeType: string | null | undefined): PrevailingWageRate | null {
  const trade = normalizeTrade(tradeType);
  const st = (state || "").trim().toUpperCase();
  const stateRates = (st && RATES[st]) || RATES.DEFAULT;
  const r = stateRates[trade] || RATES.DEFAULT[trade];
  if (!r) return null;
  return {
    trade,
    tradeLabel: TRADE_LABELS[trade] || "Construction Craft Laborer",
    state: st || "US",
    base: r.base,
    fringe: r.fringe,
    total: r.base + r.fringe,
    source: "reference-estimate",
  };
}
