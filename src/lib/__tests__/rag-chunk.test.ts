import { describe, it, expect } from "vitest";
import { chunkText, estimateTokens } from "@/lib/rag-chunk";

describe("rag-chunk: chunkText", () => {
  it("returns nothing for empty or whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps a short document as a single chunk", () => {
    const chunks = chunkText("Roof replacement scope: tear off, install TPO, flash all penetrations.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].content).toContain("TPO");
  });

  it("splits a long document into multiple ordered chunks under the size cap", () => {
    const para = "This is a sentence about commercial roofing scope and materials. ".repeat(20); // ~1300 chars
    const doc = Array.from({ length: 8 }, (_, i) => `Paragraph ${i}. ${para}`).join("\n\n");
    const chunks = chunkText(doc, { maxChars: 1500, overlapChars: 150 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i); // contiguous, 0-based
      expect(c.content.length).toBeLessThanOrEqual(1500 + 150 + 50); // cap + overlap slack
    });
  });

  it("carries overlap so a fact spanning a boundary survives", () => {
    const a = "AlphaFact ".repeat(120); // ~1200 chars
    const b = "BetaFact ".repeat(120);
    const chunks = chunkText(`${a}\n\n${b}`, { maxChars: 1200, overlapChars: 200 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // The second chunk begins with the tail of the first (overlap).
    expect(chunks[1].content.startsWith("AlphaFact") || chunks[1].content.includes("AlphaFact")).toBe(true);
  });

  it("hard-splits a single paragraph larger than the cap", () => {
    const monster = "word ".repeat(2000); // ~10k chars, one paragraph
    const chunks = chunkText(monster, { maxChars: 2000, overlapChars: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.content.length).toBeLessThanOrEqual(2000 + 50));
  });

  it("captures a markdown heading for citations", () => {
    const doc = "# Section 07 40 00 — Roofing\n\nInstall standing seam metal roof over the canopy structure per plans.";
    const chunks = chunkText(doc);
    expect(chunks[0].heading).toMatch(/Section 07 40 00/);
  });

  it("captures an ALL-CAPS / SECTION style heading", () => {
    const doc = "SECTION 075423 - TPO ROOFING\n\nProvide and install a fully adhered TPO membrane system.";
    const chunks = chunkText(doc);
    expect(chunks[0].heading).toMatch(/075423|TPO ROOFING/);
  });

  it("estimateTokens grows with length and is never zero for real text", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});
