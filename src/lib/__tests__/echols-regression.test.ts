import { describe, it, expect } from "vitest";
import { computeTotals, JOB_DESCRIPTION_MAX_LENGTH } from "@/lib/pricing";
import { buildPrompt, DEFAULT_PRICING } from "@/lib/proposal-ai.server";
import { verifyScopeCompleteness } from "@/lib/scope-completeness";
import {
  ECHOLS_DESCRIPTION,
  ECHOLS_MATERIALS_COMPLETE,
  ECHOLS_LABOR_COMPLETE,
  ECHOLS_MATERIALS_TRUNCATED,
  ECHOLS_LABOR_TRUNCATED,
  ECHOLS_OVERHEAD_PCT,
  ECHOLS_TAX_RATE,
  ECHOLS_BAND,
  ECHOLS_REAL_TOTAL,
} from "./fixtures/echols";

/**
 * End-to-end regression for the Echols K-8 TPO roofing job. The real winning
 * estimate was $295,644.98; Jobbidder used to return ~$165k (~44% low) because
 * spec text was silently truncated before it reached the model. These tests lock
 * in the four guarantees from the task.
 */
describe("Echols K-8 TPO roofing regression", () => {
  // (1) The full description reaches the prompt untruncated.
  describe("full description reaches the AI prompt untruncated", () => {
    it("is a large real spec that fits within the (non-truncating) limit", () => {
      // Real spec section + scope summary — tens of thousands of characters.
      expect(ECHOLS_DESCRIPTION.length).toBeGreaterThan(27_000);
      // It fits under the ceiling, so it is accepted whole — never cut.
      expect(ECHOLS_DESCRIPTION.length).toBeLessThan(JOB_DESCRIPTION_MAX_LENGTH);
    });

    it("embeds the ENTIRE job description in the prompt sent to the model", () => {
      const { user } = buildPrompt(
        {
          client_name: "RAM General Contracting",
          job_address: "Echols K-8 School",
          trade_type: "Roofing",
          job_description: ECHOLS_DESCRIPTION,
        },
        "Test Roofing Co",
        DEFAULT_PRICING,
      );

      // The whole description is present verbatim — nothing sliced off.
      expect(user).toContain(ECHOLS_DESCRIPTION);
      // And specifically the head AND tail survive (truncation would drop the tail).
      expect(user).toContain("SECTION 075423"); // very start of the spec
      expect(user).toContain("END OF SECTION"); // very end of the spec
      expect(user).toContain("Corrugated Metal Canopy"); // scope summary, last
      // The prompt is at least as long as the description it must carry.
      expect(user.length).toBeGreaterThanOrEqual(ECHOLS_DESCRIPTION.length);
    });
  });

  // (3) Line items exist for canopy, gutters, downspouts, and drip edge.
  describe("every dropped scope item is priced as its own line", () => {
    const haystack = [
      ...ECHOLS_MATERIALS_COMPLETE.map((m) => `${m.item} ${m.description}`),
      ...ECHOLS_LABOR_COMPLETE.map((l) => l.task),
    ]
      .join("\n")
      .toLowerCase();

    it.each(["canopy", "gutter", "downspout", "drip edge"])(
      "has a line item mentioning %s",
      (term) => {
        expect(haystack).toContain(term);
      },
    );
  });

  // (2) + (4) Total lands in the acceptance band AND overhead is a real line.
  describe("total with overhead lands within 5% of the real estimate", () => {
    const totals = computeTotals(
      ECHOLS_MATERIALS_COMPLETE,
      ECHOLS_LABOR_COMPLETE,
      "better",
      ECHOLS_TAX_RATE,
      ECHOLS_OVERHEAD_PCT,
    );

    it("applies overhead as a non-zero line in the totals", () => {
      expect(totals.overheadAmount).toBeGreaterThan(0);
      // ~$60k of non-measured costs on this job.
      expect(totals.overheadAmount).toBeGreaterThan(55_000);
    });

    it(`grand total is within $280,862–$310,426 (real: $${ECHOLS_REAL_TOTAL})`, () => {
      expect(totals.grandTotal).toBeGreaterThanOrEqual(ECHOLS_BAND.low);
      expect(totals.grandTotal).toBeLessThanOrEqual(ECHOLS_BAND.high);
    });

    it("overhead is actually part of the grand total (not stored-but-ignored)", () => {
      const withoutOverhead = computeTotals(
        ECHOLS_MATERIALS_COMPLETE,
        ECHOLS_LABOR_COMPLETE,
        "better",
        ECHOLS_TAX_RATE,
        0,
      );
      expect(totals.grandTotal - withoutOverhead.grandTotal).toBeCloseTo(totals.overheadAmount, 2);
    });
  });

  // The scope-completeness guard — catches the exact failure mode from the ticket.
  describe("scope-completeness guard", () => {
    it("passes when every mentioned system is priced", () => {
      const result = verifyScopeCompleteness(
        ECHOLS_DESCRIPTION,
        ECHOLS_MATERIALS_COMPLETE,
        ECHOLS_LABOR_COMPLETE,
      );
      expect(result.complete).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("flags canopy, gutters, downspouts and drip edge when truncation drops them", () => {
      const result = verifyScopeCompleteness(
        ECHOLS_DESCRIPTION,
        ECHOLS_MATERIALS_TRUNCATED,
        ECHOLS_LABOR_TRUNCATED,
      );
      expect(result.complete).toBe(false);
      expect(result.missing).toEqual(
        expect.arrayContaining(["Canopy", "Gutters", "Downspouts", "Drip edge"]),
      );
      expect(result.message).toMatch(/likely low/i);
    });

    it("a truncated proposal would fall BELOW the acceptance band (why the guard matters)", () => {
      const truncatedTotal = computeTotals(
        ECHOLS_MATERIALS_TRUNCATED,
        ECHOLS_LABOR_TRUNCATED,
        "better",
        ECHOLS_TAX_RATE,
        ECHOLS_OVERHEAD_PCT,
      ).grandTotal;
      expect(truncatedTotal).toBeLessThan(ECHOLS_BAND.low);
    });
  });
});
