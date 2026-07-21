import { describe, it, expect } from "vitest";
import { verifyScopeCompleteness } from "@/lib/scope-completeness";

describe("verifyScopeCompleteness", () => {
  it("reports complete when there is nothing recognizable to check", () => {
    const r = verifyScopeCompleteness("Some vague work", [], []);
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.message).toBeNull();
  });

  it("does not flag an item the input never mentioned", () => {
    const r = verifyScopeCompleteness(
      "Install TPO membrane on the flat roof.",
      [{ item: "TPO membrane", description: "60 mil" }],
      [],
    );
    // Gutters were never mentioned, so they can't be 'missing'.
    expect(r.missing).not.toContain("Gutters");
    expect(r.complete).toBe(true);
  });

  it("flags an item mentioned in the input but absent from the line items", () => {
    const r = verifyScopeCompleteness(
      "Install TPO membrane and new gutters and downspouts.",
      [{ item: "TPO membrane", description: "60 mil mechanically fastened" }],
      [{ task: "Membrane install labor" }],
    );
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("Gutters");
    expect(r.missing).toContain("Downspouts");
    expect(r.matched).toContain("Membrane / TPO");
  });

  it("counts a match found only in the labor lines", () => {
    const r = verifyScopeCompleteness(
      "Furnish and install a drip edge around the perimeter.",
      [],
      [{ task: "Install drip-edge", description: "perimeter" }],
    );
    expect(r.complete).toBe(true);
    expect(r.matched).toContain("Drip edge");
  });

  it("treats extracted spec systems as input mentions too", () => {
    const r = verifyScopeCompleteness(
      "See attached spec.",
      [{ item: "TPO membrane" }],
      [],
      [{ name: "Corrugated Metal Canopy", description: "entrance canopy" }],
    );
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("Canopy");
  });

  it("matches hyphen and spacing variants (drip edge / drip-edge)", () => {
    const inInput = verifyScopeCompleteness("New drip-edge required", [{ item: "6\" drip edge" }], []);
    expect(inInput.complete).toBe(true);
    expect(inInput.matched).toContain("Drip edge");
  });
});
