/**
 * Scope-completeness guard.
 *
 * The Echols K-8 TPO job failed because scope items named in the spec (canopy,
 * gutters, downspouts, drip edge, overhead work) never made it into the priced
 * line items, so the proposal came back ~44% low with full confidence. Raising
 * the input/output limits stops text from being *dropped*, but the model can
 * still simply forget to price a system that is clearly in the description.
 *
 * This guard is the safety net: after a proposal is generated, we scan the
 * INPUT description for well-known scope items, then check whether each one that
 * was mentioned actually shows up somewhere in the generated line items. Any
 * item that is in the input but has no matching line item is reported as
 * "missing" so the proposal can be flagged with a visible warning instead of
 * quietly returning a low number.
 *
 * It is deliberately a pure function with no I/O so it is easy to unit-test and
 * safe to call from any generation path (authenticated, public intake, webhook).
 */

/** A scope item we know how to look for. `match` must find it in free text. */
interface ScopeTerm {
  /** stable key */
  key: string;
  /** human label shown in the warning */
  label: string;
  /** matches the item in either the input description or the line items */
  match: RegExp;
}

/**
 * Curated list of scope items that carry real cost, are unambiguous when named,
 * and are the kind of discrete system an AI pricing pass tends to forget — the
 * sheet-metal / edge-metal package plus the core roof build-up. If the input
 * names one of these and no line item prices it, that is a genuine red flag.
 *
 * Deliberately EXCLUDED (they appear all over a full CSI spec section as cross-
 * references, submittals, or "by others" scope, so treating every mention as
 * required would produce constant false positives): walkways / walk pads,
 * equipment curbs, roof drains, skylights, and counterflashing. A real roofer's
 * estimate routinely omits these as separate lines because another trade carries
 * them or they are bundled — flagging them would cry wolf and train users to
 * ignore the warning. The high-value items that actually get dropped (and did on
 * Echols: canopy, gutters, downspouts, drip edge) stay on the list.
 *
 * Each regex is case-insensitive and anchored on word boundaries.
 */
const SCOPE_TERMS: ScopeTerm[] = [
  { key: "canopy", label: "Canopy", match: /\bcanop(?:y|ies)\b/i },
  { key: "gutter", label: "Gutters", match: /\bgutters?\b/i },
  { key: "downspout", label: "Downspouts", match: /\b(?:downspouts?|leaders?)\b/i },
  { key: "drip_edge", label: "Drip edge", match: /\bdrip[\s-]?edge\b/i },
  { key: "coping", label: "Coping", match: /\bcopings?\b/i },
  { key: "fascia", label: "Fascia", match: /\bfascias?\b/i },
  { key: "soffit", label: "Soffit", match: /\bsoffits?\b/i },
  { key: "scupper", label: "Scuppers", match: /\bscuppers?\b/i },
  { key: "parapet", label: "Parapet", match: /\bparapets?\b/i },
  { key: "flashing", label: "Flashing", match: /\bflashings?\b/i },
  { key: "membrane", label: "Membrane / TPO", match: /\b(?:tpo|membranes?)\b/i },
  { key: "insulation", label: "Insulation", match: /\binsulation\b/i },
  { key: "cover_board", label: "Cover board", match: /\bcover[\s-]?board\b/i },
];

export interface ScopeCheckResult {
  /** true when every scope item found in the input has a matching line item */
  complete: boolean;
  /** labels of items mentioned in the input but missing from the line items */
  missing: string[];
  /** labels of items found in both input and line items (for debugging/audit) */
  matched: string[];
  /** a ready-to-show warning sentence, or null when nothing is missing */
  message: string | null;
}

/** Minimal shapes the guard reads from — matches the AI output line items. */
interface MaterialLike {
  item?: string | null;
  description?: string | null;
}
interface LaborLike {
  task?: string | null;
  description?: string | null;
}
interface ExtractedSystemLike {
  name?: string | null;
  description?: string | null;
}

/**
 * Compare the scope items named in the input against the generated line items.
 *
 * @param jobDescription the raw text the estimator/client submitted
 * @param materials      generated material line items
 * @param labor          generated labor line items
 * @param extractedSystems optional systems pulled from an uploaded spec PDF —
 *                         these count as "input mentions" too
 */
export function verifyScopeCompleteness(
  jobDescription: string,
  materials: MaterialLike[] = [],
  labor: LaborLike[] = [],
  extractedSystems: ExtractedSystemLike[] = [],
): ScopeCheckResult {
  // What the client/estimator asked for: the description + any extracted systems.
  const inputHaystack = [
    jobDescription || "",
    ...extractedSystems.flatMap((s) => [s?.name || "", s?.description || ""]),
  ].join("\n");

  // What the proposal actually priced: every material + labor line's text.
  const outputHaystack = [
    ...materials.flatMap((m) => [m?.item || "", m?.description || ""]),
    ...labor.flatMap((l) => [l?.task || "", l?.description || ""]),
  ].join("\n");

  const missing: string[] = [];
  const matched: string[] = [];

  for (const term of SCOPE_TERMS) {
    // Fresh lastIndex each test — these regexes have no /g flag, but reset defensively.
    const inInput = term.match.test(inputHaystack);
    if (!inInput) continue;
    const inOutput = term.match.test(outputHaystack);
    if (inOutput) matched.push(term.label);
    else missing.push(term.label);
  }

  const complete = missing.length === 0;
  const message = complete
    ? null
    : `This proposal may be incomplete. The job description mentions ${missing.join(
        ", ",
      )}, but no matching line item was priced. Review before sending — the total is likely low.`;

  return { complete, missing, matched, message };
}
