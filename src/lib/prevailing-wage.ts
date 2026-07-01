/**
 * Prevailing Wage — Phase 1: trigger + warning system.
 *
 * Deterministic, server-side risk flag. Does NOT calculate prevailing-wage
 * rates (that's Phase 2) — it only flags "this job might be prevailing wage,
 * verify before you send this," so a public-funded job never slips out priced
 * at market rate.
 *
 * Used at every proposal entry point (public intake, voice estimate, in-app
 * New Proposal) so the flag can't be skipped, and surfaced as an amber banner
 * on the proposal page.
 */

export type PrevailingWageFlag = "true" | "false" | "unknown";

export interface PrevailingWageResult {
  flag: PrevailingWageFlag;
  source: string; // direct_answer | uncertain | keyword_match | none
  notice: string | null;
  keyword_matched: boolean;
}

/** Case-insensitive keyword safety net — blunt by design (false positives are cheap, false negatives are not). */
export const PREVAILING_WAGE_KEYWORDS = [
  "school district", "board of education", "county", "municipal", "municipality",
  "city of", "town of", "housing authority", "public works", "rfp", "public bid",
  "government", "federal", "state contract", "va hospital", "army corps",
  "public school", "community college", "state university", "courthouse",
  "fire department", "police department", "dot", "department of transportation",
];

const BASE_NOTICE =
  "⚠️ PREVAILING WAGE NOTICE: This project may be subject to prevailing wage requirements " +
  "(Davis-Bacon Act or state equivalent) due to public funding, government ownership, or " +
  "incentive financing. Labor rates in this estimate are market-rate estimates only and may " +
  "NOT meet legal minimum requirements for this project. Verify wage determination requirements " +
  "for this location and project type before submitting this proposal or beginning work. " +
  "Contact your local Department of Labor or a prevailing wage compliance service.";

function normalizeFlag(v: unknown): PrevailingWageFlag {
  if (v === true) return "true";
  if (v === false) return "false";
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return "true";
  if (["unknown", "not sure", "notsure", "unsure", "maybe"].includes(s)) return "unknown";
  // "false", "no", "", and anything else → false (still runs the keyword scan)
  return "false";
}

function buildNotice(flag: PrevailingWageFlag, source: string): string | null {
  if (flag === "false") return null; // no compliance noise on ordinary private jobs
  if (source === "uncertain" || source === "keyword_match") return "ACTION REQUIRED: " + BASE_NOTICE;
  return BASE_NOTICE;
}

/**
 * Resolve the prevailing-wage flag + notice for a job.
 * The direct answer wins; otherwise the keyword scan can bump a false/blank to "unknown".
 */
export function evaluatePrevailingWage(opts: {
  flag?: unknown;
  source?: string | null;
  jobDescription?: string | null;
  clientName?: string | null;
}): PrevailingWageResult {
  let flag = normalizeFlag(opts.flag);
  let source =
    (opts.source || "").trim() ||
    (flag === "true" ? "direct_answer" : flag === "unknown" ? "uncertain" : "");

  const text = `${opts.jobDescription || ""} ${opts.clientName || ""}`.toLowerCase();
  const keyword_matched = PREVAILING_WAGE_KEYWORDS.some((kw) => text.includes(kw));

  // Keyword safety net: if the answer was "No"/blank but the text gives it away, escalate to "unknown".
  if (keyword_matched && flag !== "true") {
    flag = "unknown";
    source = "keyword_match";
  }

  return {
    flag,
    source: source || "none",
    notice: buildNotice(flag, source),
    keyword_matched,
  };
}

/** Read a stored prevailing-wage result back out of a proposal's raw_input JSON. */
export function readPrevailingWage(rawInput: unknown): PrevailingWageResult | null {
  if (!rawInput || typeof rawInput !== "object") return null;
  const pw = (rawInput as Record<string, any>).prevailing_wage;
  if (!pw || typeof pw !== "object") return null;
  return {
    flag: (pw.flag as PrevailingWageFlag) ?? "false",
    source: pw.source ?? "none",
    notice: pw.notice ?? null,
    keyword_matched: !!pw.keyword_matched,
  };
}
