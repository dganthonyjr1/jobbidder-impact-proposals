import { describe, it, expect } from "vitest";
import { extractTextFromFile, SUPPORTED_UPLOAD_EXTENSIONS } from "@/lib/file-extract.server";

const buf = (s: string) => Buffer.from(s, "utf-8");

describe("file-extract: text formats", () => {
  it("reads plain text (.txt)", async () => {
    const r = await extractTextFromFile(buf("Roof scope: tear off and install TPO."), "notes.txt");
    expect(r.kind).toBe("text");
    expect(r.text).toContain("TPO");
  });

  it("reads Markdown (.md)", async () => {
    const r = await extractTextFromFile(buf("# Warranty\n\n1-year workmanship."), "warranty.md");
    expect(r.kind).toBe("text");
    expect(r.text).toContain("workmanship");
  });

  it("reads CSV (.csv) as-is", async () => {
    const r = await extractTextFromFile(buf("item,unit,cost\nTPO,sqft,1.30"), "prices.csv");
    expect(r.kind).toBe("csv");
    expect(r.text).toContain("TPO");
    expect(r.text).toContain("1.30");
  });
});

describe("file-extract: .eml parser (dependency-free)", () => {
  it("extracts subject, sender, and a quoted-printable body", async () => {
    const eml = [
      "From: Estimator <est@example.com>",
      "To: Client <client@example.com>",
      "Subject: Echols Roof Warranty",
      "Date: Wed, 01 Jul 2026 10:00:00 -0400",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "We quoted a 20=2Dyear warranty on the membrane.",
    ].join("\r\n");
    const r = await extractTextFromFile(buf(eml), "thread.eml");
    expect(r.kind).toBe("email");
    expect(r.text).toContain("Subject: Echols Roof Warranty");
    expect(r.text).toContain("est@example.com");
    // =2D decodes to a hyphen -> "20-year"
    expect(r.text).toContain("20-year warranty");
  });

  it("decodes an encoded-word subject and picks the text/plain part of a multipart message", async () => {
    const boundary = "BOUND123";
    const eml = [
      "Subject: =?utf-8?B?" + Buffer.from("Bid Follow-up").toString("base64") + "?=",
      "From: a@b.com",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Plain body: please review the attached bid.",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>HTML body should be ignored when plain exists</p>",
      `--${boundary}--`,
    ].join("\r\n");
    const r = await extractTextFromFile(buf(eml), "msg.eml");
    expect(r.text).toContain("Subject: Bid Follow-up");
    expect(r.text).toContain("please review the attached bid");
    expect(r.text).not.toContain("should be ignored");
  });
});

describe("file-extract: error handling", () => {
  it("rejects old binary .doc with a helpful message", async () => {
    await expect(extractTextFromFile(buf("x"), "old.doc")).rejects.toThrow(/re-save as \.docx/i);
  });

  it("rejects an unknown extension", async () => {
    await expect(extractTextFromFile(buf("x"), "mystery.xyz")).rejects.toThrow(/unsupported file type/i);
  });

  it("advertises the expected supported extensions", () => {
    expect(SUPPORTED_UPLOAD_EXTENSIONS).toEqual(
      expect.arrayContaining([".pdf", ".docx", ".xlsx", ".csv", ".txt", ".pptx", ".eml", ".msg"]),
    );
  });
});
