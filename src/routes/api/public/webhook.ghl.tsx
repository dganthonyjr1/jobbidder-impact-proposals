import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";
import { sendEmailViaGHL, sendSmsViaGHL, type GhlCredentials } from "@/lib/ghl.server";
import Groq from "groq-sdk";

type JsonRecord = Record<string, any>;

function firstString(...values: any[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function custom(body: JsonRecord, ...keys: string[]): any {
  const sources = [
    body.custom_fields,
    body.customFields,
    body.customField,
    body.contact?.customFields,
    body.contact?.custom_fields,
  ];
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      for (const item of source) {
        const key = String(item?.key || item?.name || item?.fieldKey || item?.id || "").toLowerCase();
        if (keys.map((k) => k.toLowerCase()).includes(key)) return item?.value ?? item?.field_value;
      }
    } else if (typeof source === "object") {
      for (const key of keys) {
        if (source[key] != null) return source[key];
        const match = Object.keys(source).find((k) => k.toLowerCase() === key.toLowerCase());
        if (match) return source[match];
      }
    }
  }
  return null;
}

function normalizeState(value: string | null) {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  return v.length >= 2 ? v.slice(0, 2) : null;
}

function leadName(body: JsonRecord) {
  return firstString(
    body.full_name,
    body.fullName,
    body.name,
    body.contact?.name,
    [body.first_name || body.firstName || body.contact?.firstName, body.last_name || body.lastName || body.contact?.lastName].filter(Boolean).join(" "),
  ) || "Unknown Lead";
}

function cors(headers: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...headers,
  };
}

function toGhlCredentials(contractor: any): GhlCredentials | null {
  const token = contractor?.ghl_api_token;
  const locationId = contractor?.ghl_location_id;
  if (!token || !locationId) return null;
  return {
    apiToken: token,
    locationId,
    fromNumber: contractor?.sms_from_number || contractor?.ghl_from_number,
    fromEmail: contractor?.email_from || contractor?.ghl_from_email,
  };
}

function wantsEmailOnly(body: JsonRecord) {
  const mode = String(body.delivery_mode || body.deliveryMode || custom(body, "delivery_mode", "deliveryMode") || "").toLowerCase();
  return body.skip_sms === true || body.skipSms === true || mode === "email_only" || mode === "email-only" || mode === "email";
}

type AIProposalShape = {
  scope_of_work: string;
  timeline: string;
  warranty: string;
  exclusions: string[];
  materials: { item: string; description?: string; qty: number; unit: string; retail_price: number; sia_price?: number | null }[];
  labor: { task: string; description?: string; hours: number; rate: number }[];
  tiers: { good: { label: string; description: string }; better: { label: string; description: string }; best: { label: string; description: string } };
};

async function callGroqAI(opts: {
  clientName: string;
  jobAddress: string | null;
  jobState: string | null;
  tradeType: string | null;
  jobDescription: string;
  businessName: string;
}): Promise<AIProposalShape | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[webhook.ghl] GROQ_API_KEY not set — skipping AI generation");
    return null;
  }

  const sys = `You are an expert contractor estimator for ${opts.businessName} (${opts.tradeType || "general contracting"}). Produce a realistic, professional proposal with itemized materials and labor in USD. Always include a 10% waste factor on flooring and tile quantities. Return ONLY valid JSON matching the schema.`;
  const user = `Job for ${opts.clientName} at ${opts.jobAddress || "TBD"} (state: ${opts.jobState || "n/a"}).\nTrade: ${opts.tradeType || "general"}\nDescription: ${opts.jobDescription}\n\nReturn JSON: { "scope_of_work": string, "timeline": string, "warranty": string, "exclusions": string[], "materials": [{"item":string,"description":string,"qty":number,"unit":string,"retail_price":number,"sia_price":number}], "labor": [{"task":string,"description":string,"hours":number,"rate":number}], "tiers": {"good":{"label":string,"description":string},"better":{"label":string,"description":string},"best":{"label":string,"description":string}} }`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? jsonMatch[0] : cleaned;
    return JSON.parse(content) as AIProposalShape;
  } catch (e) {
    console.error("[webhook.ghl] Groq AI call failed:", (e as Error).message);
    return null;
  }
}

export const Route = createFileRoute("/api/public/webhook/ghl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const contractorId = url.searchParams.get("contractor");
        if (!contractorId) {
          return Response.json({ ok: false, error: "Missing contractor" }, { status: 400, headers: cors() });
        }

        const body: JsonRecord = await request.json().catch(() => ({}));
        const origin = url.origin;
        const clientName = leadName(body);
        const clientEmail = firstString(body.email, body.contact?.email);
        const clientPhone = firstString(body.phone, body.phone_number, body.contact?.phone, body.contact?.phoneNumber);
        const jobDescription = firstString(
          custom(body, "job_description", "jobDescription", "project_details", "projectDetails", "scope", "message"),
          body.message,
          body.call_summary,
          body.callSummary,
          body.summary,
          "GHL voice-agent lead",
        );
        const jobAddress = firstString(custom(body, "job_address", "jobAddress"), body.address1, body.address, body.contact?.address1);
        const jobState = normalizeState(firstString(custom(body, "state", "job_state", "jobState"), body.state, body.contact?.state));
        const tradeType = firstString(custom(body, "trade_type", "tradeType", "service", "project_type"), body.trade_type);

        // Load contractor for business name and GHL credentials
        const { data: contractor, error: contractorError } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, ghl_api_token, ghl_location_id, sms_from_number, email_from")
          .eq("id", contractorId)
          .maybeSingle();
        if (contractorError) console.warn("[webhook.ghl] Contractor lookup failed:", contractorError.message);

        const businessName = contractor?.business_name || "Jobbidder";

        // Call Groq AI to generate the full proposal content
        const ai = await callGroqAI({
          clientName,
          jobAddress,
          jobState,
          tradeType,
          jobDescription: jobDescription || "GHL voice-agent lead",
          businessName,
        });

        const validThrough = new Date();
        validThrough.setDate(validThrough.getDate() + 30);

        const insert = {
          contractor_id: contractorId,
          proposal_number: generateProposalNumber(),
          status: "draft",
          source: "ghl",
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          job_address: jobAddress,
          job_state: jobState,
          trade_type: tradeType,
          job_description: jobDescription,
          raw_input: body,
          valid_through: validThrough.toISOString().slice(0, 10),
          // AI-generated fields (fallback to raw description if AI failed)
          scope_of_work: ai?.scope_of_work || jobDescription || "",
          timeline: ai?.timeline || "",
          warranty: ai?.warranty || "",
          exclusions: ai?.exclusions || [],
          materials: ai?.materials || [],
          labor: ai?.labor || [],
          tiers: ai?.tiers || {},
        };

        const { data: created, error } = await supabaseAdmin
          .from("proposals")
          .insert(insert)
          .select("id, proposal_number")
          .single();

        if (error) {
          console.error("GHL webhook proposal insert failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500, headers: cors() });
        }

        const proposalUrl = `${origin}/p/${created.id}`;
        const notify = body.notify !== false && body.send_notifications !== false;
        const emailOnly = wantsEmailOnly(body);
        const ghlCredentials = toGhlCredentials(contractor);
        const smsAllowed = !emailOnly;
        let email: any = { skipped: !clientEmail ? "no email" : "disabled" };
        let sms: any = { skipped: !clientPhone ? "no phone" : emailOnly ? "email-only delivery" : "disabled" };

        if (notify && clientEmail) {
          email = await sendEmailViaGHL({
            to: clientEmail,
            subject: `Your Jobbidder proposal ${created.proposal_number}`,
            text: `Hi ${clientName}, your proposal ${created.proposal_number} is ready to review: ${proposalUrl}`,
            html: `<p>Hi ${clientName},</p><p>Your proposal <strong>${created.proposal_number}</strong> is ready to review.</p><p><a href="${proposalUrl}">Open proposal</a></p>`,
            contactName: clientName,
            contactPhone: clientPhone,
            tags: ["jobbidder", "proposal-ready"],
            credentials: ghlCredentials,
          });
        }

        if (notify && clientPhone && smsAllowed) {
          sms = await sendSmsViaGHL({
            to: clientPhone,
            body: `Your Jobbidder proposal ${created.proposal_number} is ready: ${proposalUrl}`,
            contactName: clientName,
            contactEmail: clientEmail || undefined,
            tags: ["jobbidder", "proposal-ready"],
            credentials: ghlCredentials,
          });
        }

        return Response.json({ ok: true, proposal_id: created.id, proposal_number: created.proposal_number, proposal_url: proposalUrl, ai_generated: !!ai, email, sms }, { headers: cors() });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
