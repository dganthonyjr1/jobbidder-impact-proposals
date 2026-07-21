import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MaterialLine, LaborLine } from "@/lib/pricing";

/**
 * Regression fixture for the Echols K-8 School TPO roofing job.
 *
 * SOURCES (both real documents, extracted verbatim):
 *  - The architect's spec: CSI Section 075423 "Thermoplastic-Polyolefin (TPO)
 *    Roofing" (echols-tpo-spec-075423.txt, 27k chars). This is the full spec
 *    section — the exact kind of text that used to get silently truncated.
 *  - The real winning estimate: ADG's "Echols K-8 School Roofing" proposal to
 *    RAM General Contracting, dated 12/16/2024, total $295,644.98. Its scope
 *    summary and grouped line-item subtotals are reproduced below.
 *
 * The expected line items and overhead reproduce that real estimate so the test
 * asserts against a genuine professional number, not an invented one.
 */

// ── The full job description an estimator would submit for this job ──────────
// = the architect's TPO spec section + the real estimate's scope summary (which
//   is where the canopy / gutters / downspouts / drip edge are named). The spec
//   section alone covers membrane/insulation/coping; the sheet-metal scope lives
//   in the summary, exactly as on the real job.
const SPEC_075423 = readFileSync(
  fileURLToPath(new URL("./echols-tpo-spec-075423.txt", import.meta.url)),
  "utf8",
);

const ECHOLS_SCOPE_SUMMARY = `
PROJECT SCOPE SUMMARY — Echols K-8 School Roofing (RAM General Contracting)

TPO Mechanically Attached Roofing System with Corrugated Metal Roof Canopy.
Mechanically fastened, 60 mil thermoplastic polyolefin (TPO) roofing system.
Gray color vertical, White horizontal.

Underlayment: 0.25" gypsum cover board; ISO 4.5" total (2" + 2" + 2.5"); Metal
Canopy Ice & Water Shield.

Parapet Flashing & Coping, Gutters & Downspouts. 24 Ga steel with Kynar coating.
20-year warranty.

Systems to price:
- 3' Parapet Section 1 (flashing & coping)
- Corrugated Metal Canopy
- Downspouts
- Drip Edge
- Gutters
- TPO Membrane & Underlayment
`;

/** The complete, untruncated job description for the Echols job. */
export const ECHOLS_DESCRIPTION = `${SPEC_075423}\n\n${ECHOLS_SCOPE_SUMMARY}`;

// ── Real total from the ADG estimate ────────────────────────────────────────
export const ECHOLS_REAL_TOTAL = 295_644.98;
/** Acceptance band from the task: within 5% of the real total. */
export const ECHOLS_BAND = { low: 280_862, high: 310_426 };

/**
 * Overhead as a percentage of measured scope. The real estimate lists overhead
 * as a flat "Non-measured costs" line of $60,009.62 on $223,118.52 of measured
 * work = 26.9%. Jobbidder models overhead as a percentage, so we express it that
 * way. (Note: this is well above the 12% platform default — a roofing contractor
 * must have their per-trade overhead configured for the total to come out right.)
 */
export const ECHOLS_OVERHEAD_PCT = 26.9;
export const ECHOLS_TAX_RATE = 0.07;

/**
 * COMPLETE, correctly-priced line items — every system from the real estimate.
 * Material sia_price × qty sums to $178,812.00 (the taxed material portion) and
 * labor hours × rate sums to $44,306.52 (untaxed), together = the $223,118.52 of
 * measured scope in the real estimate. Amounts are carved from the real grouped
 * subtotals (each group split into its material and install-labor share).
 */
export const ECHOLS_MATERIALS_COMPLETE: MaterialLine[] = [
  {
    item: "TPO 60-mil Membrane & Underlayment",
    description:
      "UltraPly TPO membrane & bonding adhesive, ISO 95+ insulation (4.5\" total), 1/4\" DensDeck gypsum cover board, fasteners, seam & insulation plates, ice & water shield, splice wash.",
    qty: 1,
    unit: "roof system",
    sia_price: 105_891.93,
    retail_price: 121_775.72,
  },
  {
    item: "Corrugated Metal Roof Canopy — SSR 24 Ga panels",
    description: "Metal Corrugated Roof SSR 24 Ga 16\" panels & underlayment for the entrance canopy.",
    qty: 1,
    unit: "canopy",
    sia_price: 20_041.48,
    retail_price: 23_047.70,
  },
  {
    item: "Gutters — 24 Ga steel, Kynar coating",
    description: "Prefinished 24 Ga Kynar-coated steel gutters.",
    qty: 1,
    unit: "gutter run",
    sia_price: 13_362.83,
    retail_price: 15_367.25,
  },
  {
    item: "Downspouts — 24 Ga steel, Kynar coating",
    description: "Prefinished 24 Ga Kynar-coated steel downspouts / leaders.",
    qty: 1,
    unit: "downspout set",
    sia_price: 20_553.48,
    retail_price: 23_636.50,
  },
  {
    item: "6\" Metal Drip Edge",
    description: "6\" prefinished metal drip edge at eaves.",
    qty: 519,
    unit: "lin ft",
    sia_price: 19.05,
    retail_price: 21.91,
  },
  {
    item: "Parapet Flashing & Coping — 24 Ga",
    description: "24 Ga 20\" coping and parapet flashing; 3' parapet section 1.",
    qty: 1,
    unit: "parapet system",
    sia_price: 9_075.33,
    retail_price: 10_436.63,
  },
];

export const ECHOLS_LABOR_COMPLETE: LaborLine[] = [
  { task: "TPO Membrane & Underlayment — install labor", hours: 369.2308, rate: 65 },
  { task: "Metal Corrugated Roof Canopy & underlayment — install labor", hours: 184.6154, rate: 65 },
  { task: "Parapet labor @ 5' w/ coping — (2) roofers (1) laborer", hours: 76.9231, rate: 65 },
  { task: "Downspout — LF applied (install labor)", hours: 35.4849, rate: 65 },
  { task: "24 Ga coping — install labor", hours: 15.3846, rate: 65 },
];

/**
 * The BUG reproduction: what the pipeline produced when truncation dropped the
 * sheet-metal scope. Canopy, gutters, downspouts and drip edge are gone — only
 * the membrane and parapet survive. Used to prove the scope-completeness guard
 * flags exactly those missing items.
 */
export const ECHOLS_MATERIALS_TRUNCATED: MaterialLine[] = ECHOLS_MATERIALS_COMPLETE.filter(
  (m) => /tpo|parapet/i.test(m.item),
);
export const ECHOLS_LABOR_TRUNCATED: LaborLine[] = ECHOLS_LABOR_COMPLETE.filter(
  (l) => /tpo|parapet|coping/i.test(l.task) && !/canopy/i.test(l.task),
);
