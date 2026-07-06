import Groq from "groq-sdk";

/**
 * Narrative proposal generation for "service" verticals whose deliverable is a
 * written proposal document rather than an itemized materials + Good/Better/Best
 * table (moving today; cleaning, junk removal, security, consulting later).
 *
 * The output is stored on the SAME proposals row the itemized engine uses, so a
 * narrative proposal inherits the entire delivery pipeline unchanged: public
 * share link, email + SMS send, e-signature, and view tracking. Only the shape
 * of the document differs, gated by raw_input.proposal_format === "narrative".
 *
 * Pricing is stored as a single labor line (hours: 1, rate: estimated_total)
 * with no materials, so pricing.computeTotals() yields grandTotal === the
 * estimate exactly (materials are the only taxed component, and the "better"
 * tier multiplier is 1.0). This keeps the accept/deposit money path untouched.
 */

/** Does this trade use the narrative (prose) proposal format instead of tiers? */
export function isNarrativeTrade(tradeType?: string | null): boolean {
  const t = (tradeType || "").toLowerCase();
  return /\bmov(e|es|ing|ers?)\b|relocat|\bhaul/.test(t);
}

export interface NarrativeInput {
  client_name: string;
  job_address?: string | null; // destination address or area
  origin?: string | null;      // origin address or area
  trade_type?: string | null;
  job_description: string;
  language?: string | null;
}

export interface NarrativeContractorProfile {
  business_name?: string | null;
  license_number?: string | null;
  dot_number?: string | null;
  service_area?: string | null;
  years_in_business?: number | string | null;
}

export interface NarrativeResult {
  scope_of_work: string;   // the full prose proposal
  estimated_total: number; // numeric anchor for the accept/records path
  timeline: string;
  warranty: string;
  payment_terms: string;
}

const LANG_NAMES: Record<string, string> = { en: "English", es: "Spanish", fr: "French", pt: "Portuguese", ht: "Haitian Creole" };

function buildMovingPrompt(
  input: NarrativeInput,
  contractor: NarrativeContractorProfile,
): { system: string; user: string } {
  const langName = LANG_NAMES[input.language || "en"] || "English";

  const system = `You are a professional proposal writer for a licensed and insured moving company. Generate a complete, client-ready moving proposal based on the job details provided. Write in flowing professional prose with no bullet points, no hyphens, and no em dashes.

Write ALL prose in ${langName}.

REQUIRED PROPOSAL SECTIONS (use short plain section headings, no numbering):
1. Cover statement introducing the company and summarizing the move in two to three sentences, noting licensing, insurance, and DOT registration up front since these are the first trust checks a moving customer makes.
2. Assessment and Planning: describe the walkthrough or virtual survey, the inventory process, and for commercial moves a move plan covering sequencing, labeling systems, and a dedicated move coordinator as the client's single point of contact.
3. Scope of Services: state exactly what is included for this move. For residential, cover packing or customer packed options, loading, transport, unloading, and placement by room. For commercial or office moves, cover furniture disassembly and reassembly, workstation and cubicle teardown and setup, IT and server handling with proper disconnect and reconnect coordination, file and records transport with chain of custody, and safes or heavy machinery with specialized equipment. State what is excluded just as clearly.
4. Crew, Equipment, and Facility Protection: crew size, number and size of trucks, and protection measures including floor runners, corner guards, door jamb protection, and furniture padding. For commercial moves note coordination of certificates of insurance for both buildings, elevator reservations, and loading dock scheduling where applicable.
5. Packing Materials: boxes, crates for electronics or fragile items, mattress bags, and specialty crating, listed as included or billed as used.
6. Schedule: pre move preparation dates, move day timing with a start window, estimated duration, and for commercial moves after hours or weekend execution to minimize business downtime. Include a post move follow up.
7. Valuation and Insurance: explain released value protection versus full value protection in plain language, state the coverage included in this proposal, the option to upgrade, and the company's commercial liability coverage for property damage.
8. Storage: if storage was requested, describe the storage solution, security, and billing. If not requested, omit this section entirely.
9. Investment: pricing structured as appropriate to the move, either a binding flat rate or an hourly rate with crew size and estimated hours, plus materials and any specialty item fees, rolled to a clear total or clearly explained estimate. State that the final binding price follows the on site or virtual survey, and that no charges are added on move day beyond documented scope changes approved in writing.
10. Terms: deposit and payment schedule, cancellation and reschedule policy, claims process for any damage with its reporting window, and proposal validity of 30 days.

Tone: reassuring and logistics forward. Moving customers fear damage, hidden move day charges, and no show crews, so precision about protection, pricing finality, and the claims process wins the job. For commercial clients, minimizing downtime is the number one buying concern, so schedule certainty carries the proposal. Length: 550 to 800 words. Do not include placeholder text or notes to the contractor. If any required job detail is missing, make a reasonable industry standard assumption and mark it clearly as "to be confirmed at survey".

Return ONLY valid JSON with no markdown fences, in this exact shape:
{
  "proposal": string,          // the full proposal prose, all ten sections, 550 to 800 words
  "estimated_total": number,   // a single best estimate dollar figure for internal records; if you gave a range, use its midpoint
  "payment_terms": string,     // one plain sentence: deposit and payment schedule
  "timeline": string,          // one short line: move date or window
  "warranty": string           // one short line: valuation and claims window
}`;

  const user = `MOVING COMPANY PROFILE:
Company: ${contractor.business_name || "the moving company"}
License: ${contractor.license_number || "to be confirmed at survey"}
DOT Number: ${contractor.dot_number || "to be confirmed at survey"}
Service Area: ${contractor.service_area || "to be confirmed at survey"}
Years in Business: ${contractor.years_in_business || "to be confirmed at survey"}

JOB DETAILS:
Client: ${input.client_name}
Origin: ${input.origin || "to be confirmed at survey"}
Destination: ${input.job_address || "to be confirmed at survey"}
Details: ${input.job_description}`;

  return { system, user };
}

/**
 * Generate a narrative (prose) proposal. Returns null on any failure so the
 * caller can fall back to the itemized generator and never hard-fail.
 */
export async function generateNarrativeProposal(
  input: NarrativeInput,
  contractor: NarrativeContractorProfile,
): Promise<NarrativeResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[narrative-proposal] GROQ_API_KEY not set — skipping");
    return null;
  }

  const { system, user } = buildMovingPrompt(input, contractor);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as {
      proposal?: string;
      estimated_total?: number | string;
      payment_terms?: string;
      timeline?: string;
      warranty?: string;
    };

    const prose = (parsed.proposal || "").trim();
    if (!prose) return null;

    const estimate = Number(parsed.estimated_total) || 0;

    return {
      scope_of_work: prose,
      estimated_total: estimate > 0 ? Math.round(estimate) : 0,
      timeline: (parsed.timeline || "").trim(),
      warranty: (parsed.warranty || "").trim(),
      payment_terms: (parsed.payment_terms || "A deposit reserves your move date, with the balance due upon completion of delivery.").trim(),
    };
  } catch (e) {
    console.error("[narrative-proposal] generation failed:", (e as Error).message);
    return null;
  }
}
