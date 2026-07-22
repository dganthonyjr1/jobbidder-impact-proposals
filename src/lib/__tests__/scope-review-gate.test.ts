import { describe, it, expect } from "vitest";
import { scopeReviewBlocksSend, withScopeReviewAcknowledged } from "@/lib/scope-review-gate";

describe("scopeReviewBlocksSend", () => {
  it("does not block when there is no scope check at all", () => {
    expect(scopeReviewBlocksSend(undefined, false)).toBe(false);
    expect(scopeReviewBlocksSend(null, false)).toBe(false);
  });

  it("does not block when the scope check has nothing missing", () => {
    expect(scopeReviewBlocksSend({ missing: [] }, false)).toBe(false);
  });

  it("blocks when scope is missing and not acknowledged", () => {
    expect(scopeReviewBlocksSend({ missing: ["Gutters"] }, false)).toBe(true);
  });

  it("does not block when the caller acknowledges in this request", () => {
    expect(scopeReviewBlocksSend({ missing: ["Gutters"] }, true)).toBe(false);
  });

  it("does not block when a prior review event already exists", () => {
    expect(
      scopeReviewBlocksSend(
        { missing: ["Gutters"], acknowledged_at: "2026-07-01T00:00:00Z" },
        false,
      ),
    ).toBe(false);
  });
});

describe("withScopeReviewAcknowledged", () => {
  it("returns the scope check unchanged when nothing is missing", () => {
    const sc = { missing: [] };
    expect(withScopeReviewAcknowledged(sc, true)).toBe(sc);
  });

  it("returns the scope check unchanged when not acknowledging", () => {
    const sc = { missing: ["Gutters"] };
    expect(withScopeReviewAcknowledged(sc, false)).toBe(sc);
  });

  it("returns the scope check unchanged when already acknowledged", () => {
    const sc = { missing: ["Gutters"], acknowledged_at: "2026-07-01T00:00:00Z" };
    expect(withScopeReviewAcknowledged(sc, true)).toBe(sc);
  });

  it("stamps acknowledged_at when missing scope is newly acknowledged", () => {
    const sc = { missing: ["Gutters"], message: "review before sending" };
    const result = withScopeReviewAcknowledged(sc, true);
    expect(result).not.toBe(sc);
    expect(result?.missing).toEqual(["Gutters"]);
    expect(result?.acknowledged_at).toBeTruthy();
    expect(new Date(result!.acknowledged_at!).toString()).not.toBe("Invalid Date");
  });
});
