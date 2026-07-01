/**
 * AI-powered document data extraction for contractor pre-qualification.
 * - Images: Groq vision (llama-4-scout) reads them directly.
 * - PDFs (most licenses / ACORD COIs): the text layer is extracted and read by
 *   a Groq text model. Scanned PDFs with no text layer fall back to manual review.
 */
import Groq from "groq-sdk";

export type DocType =
  | "license"
  | "gc_license"
  | "electrical_license"
  | "plumbing_license"
  | "roofing_license"
  | "specialty_license"
  | "liability_insurance"
  | "workers_comp"
  | "surety_bond";

export type ExtractedDoc = {
  holder_name: string | null;
  license_number: string | null;
  license_class: string | null;
  state_code: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  coverage_amount: number | null;
  policy_number: string | null;
  bond_number: string | null;
  bond_amount: number | null;
  issuer_name: string | null;
  additional_insured: string | null;
  employer_liability: number | null;
  confidence: number;
  raw_notes: string | null;
};

const FIELD_PROMPTS: Record<DocType, string> = {
  license:
    "This is a contractor license. Extract: holder_name, license_number, license_class (trade specialty), state_code (2-letter), issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  gc_license:
    "This is a General Contractor (GC) license. Extract: holder_name, license_number, state_code, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  electrical_license:
    "This is an Electrical Contractor license. Extract: holder_name, license_number, state_code, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  plumbing_license:
    "This is a Plumbing Contractor license. Extract: holder_name, license_number, state_code, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  roofing_license:
    "This is a Roofing Contractor license. Extract: holder_name, license_number, state_code, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  specialty_license:
    "This is a specialty contractor license. Extract: holder_name, license_number, license_class, state_code, issue_date (YYYY-MM-DD), expiration_date (YYYY-MM-DD).",
  liability_insurance:
    "This is a Certificate of Insurance (ACORD COI) for General Liability. Extract: holder_name (named insured / certificate holder), policy_number, issuer_name (insurance company), coverage_amount (general aggregate limit as integer dollars, e.g. 1000000), expiration_date (policy period end, YYYY-MM-DD), additional_insured (any additional insured listed).",
  workers_comp:
    "This is a Workers' Compensation insurance certificate. Extract: holder_name (employer), policy_number, issuer_name (insurance company), expiration_date (coverage period end, YYYY-MM-DD), employer_liability (employer liability limit per accident as integer dollars).",
  surety_bond:
    "This is a Surety Bond / contractor bond document. Extract: holder_name (principal / contractor name), bond_number, bond_amount (penal sum / bond amount as integer dollars), issuer_name (surety company), expiration_date (bond term end, YYYY-MM-DD).",
};

export async function extractDocumentData(
  fileUrl: string,
  docType: DocType,
  mimeType: string
): Promise<ExtractedDoc> {
  const empty: ExtractedDoc = {
    holder_name: null, license_number: null, license_class: null,
    state_code: null, issue_date: null, expiration_date: null,
    coverage_amount: null, policy_number: null, bond_number: null,
    bond_amount: null, issuer_name: null, additional_insured: null,
    employer_liability: null, confidence: 0, raw_notes: null,
  };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return empty;

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || fileUrl.toLowerCase().split("?")[0].endsWith(".pdf");
  if (!isImage && !isPdf) {
    return { ...empty, raw_notes: "Unsupported file type — queue for manual review" };
  }

  const prompt = `${FIELD_PROMPTS[docType]}

Return ONLY a valid JSON object with exactly these keys (use null for anything not visible):
{
  "holder_name": null,
  "license_number": null,
  "license_class": null,
  "state_code": null,
  "issue_date": null,
  "expiration_date": null,
  "coverage_amount": null,
  "policy_number": null,
  "bond_number": null,
  "bond_amount": null,
  "issuer_name": null,
  "additional_insured": null,
  "employer_liability": null,
  "confidence": 85,
  "raw_notes": null
}

"confidence" is 0-100 reflecting how clearly the document fields were readable.
Numeric dollar amounts should be integers (no dollar signs or commas).
Dates must be YYYY-MM-DD or null.`;

  try {
    const groq = new Groq({ apiKey: groqKey });
    let responseText: string;

    if (isImage) {
      // Image: read directly with the vision model.
      const completion = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: fileUrl } },
              { type: "text", text: prompt },
            ] as any,
          },
        ],
        max_tokens: 600,
        temperature: 0,
      });
      responseText = completion.choices[0]?.message?.content ?? "{}";
    } else {
      // PDF: pull the text layer, then extract fields with a text model.
      const res = await fetch(fileUrl);
      if (!res.ok) return { ...empty, raw_notes: `Could not fetch PDF (${res.status}) — queue for manual review` };
      const buf = Buffer.from(await res.arrayBuffer());
      // @ts-expect-error - pdf-parse ships no type declarations for the /lib subpath
      const pdfMod = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = (pdfMod as any).default as (b: Buffer) => Promise<{ text?: string }>;
      const pdf = await pdfParse(buf).catch(() => null);
      const pdfText = (pdf?.text || "").trim();
      if (pdfText.replace(/\s/g, "").length < 30) {
        // No usable text layer — almost certainly a scanned image inside a PDF.
        return { ...empty, raw_notes: "PDF has no readable text (likely scanned) — queue for manual review" };
      }
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `${prompt}\n\nDOCUMENT TEXT:\n"""\n${pdfText.slice(0, 12000)}\n"""` }],
        max_tokens: 600,
        temperature: 0,
      });
      responseText = completion.choices[0]?.message?.content ?? "{}";
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return empty;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractedDoc>;
    return {
      holder_name: parsed.holder_name ?? null,
      license_number: parsed.license_number ?? null,
      license_class: parsed.license_class ?? null,
      state_code: parsed.state_code ?? null,
      issue_date: parsed.issue_date ?? null,
      expiration_date: parsed.expiration_date ?? null,
      coverage_amount: typeof parsed.coverage_amount === "number" ? parsed.coverage_amount : null,
      policy_number: parsed.policy_number ?? null,
      bond_number: parsed.bond_number ?? null,
      bond_amount: typeof parsed.bond_amount === "number" ? parsed.bond_amount : null,
      issuer_name: parsed.issuer_name ?? null,
      additional_insured: parsed.additional_insured ?? null,
      employer_liability: typeof parsed.employer_liability === "number" ? parsed.employer_liability : null,
      confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 50,
      raw_notes: parsed.raw_notes ?? null,
    };
  } catch {
    return empty;
  }
}

/** Determine verification status based on extracted data and document type. */
export function determineVerificationStatus(
  doc: ExtractedDoc,
  docType: DocType
): "ai_extracted" | "expired" | "invalid" | "needs_review" {
  if (doc.confidence < 40) return "needs_review";

  const now = new Date();

  // Check expiration
  if (doc.expiration_date) {
    const exp = new Date(doc.expiration_date);
    if (exp < now) return "expired";
  }

  // Type-specific minimum requirements
  if (docType === "liability_insurance") {
    if (!doc.policy_number && !doc.holder_name) return "needs_review";
    if (doc.coverage_amount !== null && doc.coverage_amount < 500_000) return "invalid";
  }

  if (docType === "workers_comp") {
    if (!doc.policy_number && !doc.holder_name) return "needs_review";
  }

  if (docType === "surety_bond") {
    if (!doc.bond_number && !doc.holder_name) return "needs_review";
    if (doc.bond_amount !== null && doc.bond_amount < 25_000) return "invalid";
  }

  if (["license","gc_license","electrical_license","plumbing_license","roofing_license","specialty_license"].includes(docType)) {
    if (!doc.license_number && !doc.holder_name) return "needs_review";
  }

  return "ai_extracted";
}

/** Human-readable label for document type. */
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  license:             "Contractor License",
  gc_license:          "GC License",
  electrical_license:  "Electrical License",
  plumbing_license:    "Plumbing License",
  roofing_license:     "Roofing License",
  specialty_license:   "Specialty License",
  liability_insurance: "General Liability (COI)",
  workers_comp:        "Workers' Comp",
  surety_bond:         "Surety Bond",
};

export const REQUIRED_DOC_TYPES: DocType[] = [
  "liability_insurance",
  "workers_comp",
  "surety_bond",
  "gc_license",
];
