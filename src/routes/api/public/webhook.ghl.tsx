import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateProposalNumber } from "@/lib/pricing";
import { sendEmailViaGHL, sendSmsViaGHL, type GhlCredentials } from "@/lib/ghl.server";

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

function toGhlCredentials(integration: any): GhlCredentials | null {
  if (!integration?.ghl_api_token || !integration?.ghl_location_id) return null;
  return {
    apiToken: integration.ghl_api_token,
    locationId: integration.ghl_location_id,
    fromNumber: integration.ghl_from_number,
    fromEmail: integration.ghl_from_email,
  };
}

function wantsEmailOnly(body: JsonRecord) {
  const mode = String(body.delivery_mode || body.deliveryMode || custom(body, "delivery_mode", "deliveryMode") || "").toLowerCase();
  return body.skip_sms === true || body.skipSms === true || mode === "email_only" || mode === "email-only" || mode === "email";
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

        const insert = {
          contractor_id: contractorId,
          proposal_number: generateProposalNumber(),
          status: "draft",
          source: "ghl",
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          job_address: firstString(custom(body, "job_address", "jobAddress"), body.address1, body.address, body.contact?.address1),
          job_state: normalizeState(firstString(custom(body, "state", "job_state", "jobState"), body.state, body.contact?.state)),
          trade_type: firstString(custom(body, "trade_type", "tradeType", "service", "project_type"), body.trade_type),
          job_description: jobDescription,
          raw_input: body,
          scope_of_work: jobDescription,
          materials: [],
          labor: [],
          exclusions: [],
          tiers: {},
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
        const { data: integration, error: integrationError } = await supabaseAdmin
          .from("contractor_integrations")
          .select("ghl_api_token, ghl_location_id, ghl_from_number, ghl_from_email, contractor_sms_notifications_enabled")
          .eq("contractor_id", contractorId)
          .maybeSingle();
        if (integrationError) console.warn("GHL webhook contractor integration lookup failed", integrationError.message);
        const ghlCredentials = toGhlCredentials(integration);
        const smsAllowed = !emailOnly && integration?.contractor_sms_notifications_enabled !== false;
        let email: any = { skipped: !clientEmail ? "no email" : "disabled" };
        let sms: any = { skipped: !clientPhone ? "no phone" : emailOnly ? "email-only delivery" : !smsAllowed ? "contractor SMS disabled" : "disabled" };

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

        return Response.json({ ok: true, proposal_id: created.id, proposal_number: created.proposal_number, proposal_url: proposalUrl, email, sms }, { headers: cors() });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
