import process from "node:process";
import { toE164US } from "./twilio.server";

export type GhlSmsResult =
  | { ok: true; messageId?: string; conversationId?: string; to: string }
  | { ok: false; error: string; status?: number };

export type GhlEmailResult =
  | { ok: true; messageId?: string; emailMessageId?: string; conversationId?: string; to: string }
  | { ok: false; error: string; status?: number };

type GhlContactInput = {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  language?: string | null;
  tags?: string[] | null;
};

type GhlContactResult =
  | { ok: true; contactId: string }
  | { ok: false; error: string; status?: number };

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-04-15",
  };
}

async function upsertGhlContact(input: GhlContactInput): Promise<GhlContactResult> {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return {
      ok: false,
      error: "GHL not configured (missing GHL_API_TOKEN/GHL_LOCATION_ID)",
    };
  }

  const body: Record<string, unknown> = { locationId };
  if (input.phone) body.phone = toE164US(input.phone);
  if (input.email) body.email = input.email.toLowerCase().trim();
  if (input.name) body.name = input.name;

  const language = (input.language || "").toLowerCase().trim().slice(0, 5);
  const tags = Array.from(new Set([...(input.tags || []), ...(language ? [`lang:${language}`] : [])]));
  if (tags.length) body.tags = tags;
  if (language) body.customFields = [{ key: "language", field_value: language }];

  if (!body.phone && !body.email) {
    return { ok: false, error: "GHL contact upsert requires phone or email" };
  }

  let upsertRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: ghlHeaders(token),
    body: JSON.stringify(body),
  });
  let upsertJson: any = await upsertRes.json().catch(() => ({}));

  // Some GHL locations require custom-field IDs instead of field keys. If that
  // happens, preserve delivery by retrying with tags only.
  if (!upsertRes.ok && body.customFields) {
    const retryBody = { ...body };
    delete (retryBody as Record<string, unknown>).customFields;
    upsertRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: ghlHeaders(token),
      body: JSON.stringify(retryBody),
    });
    upsertJson = await upsertRes.json().catch(() => ({}));
  }

  if (!upsertRes.ok) {
    return {
      ok: false,
      status: upsertRes.status,
      error: upsertJson?.message || `GHL contact upsert failed (${upsertRes.status})`,
    };
  }

  const contactId: string | undefined = upsertJson?.contact?.id || upsertJson?.id;
  if (!contactId) return { ok: false, error: "GHL upsert returned no contactId" };
  return { ok: true, contactId };
}

/**
 * Send an SMS via GoHighLevel's Conversations API using a Private
 * Integration Token (PIT). Requires an A2P-verified number on the
 * sub-account. Never throws — returns a result object.
 *
 * Flow:
 *   1. Upsert a contact by phone (so we have a contactId).
 *   2. POST /conversations/messages with type=SMS.
 */
export async function sendSmsViaGHL(opts: {
  to: string;
  body: string;
  fromNumber?: string;
  contactName?: string;
  contactEmail?: string;
  language?: string;
  tags?: string[];
  name?: string;
  email?: string;
}): Promise<GhlSmsResult> {
  const token = process.env.GHL_API_TOKEN;
  const fromNumber = opts.fromNumber || process.env.GHL_FROM_NUMBER;

  if (!token || !process.env.GHL_LOCATION_ID || !fromNumber) {
    return {
      ok: false,
      error: "GHL not configured (missing GHL_API_TOKEN/GHL_LOCATION_ID/GHL_FROM_NUMBER)",
    };
  }

  const to = toE164US(opts.to);
  const from = toE164US(fromNumber);

  try {
    const contact = await upsertGhlContact({
      phone: to,
      email: opts.contactEmail || opts.email,
      name: opts.contactName || opts.name,
      language: opts.language,
      tags: opts.tags,
    });
    if (!contact.ok) return contact;

    const msgRes = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: ghlHeaders(token),
      body: JSON.stringify({
        type: "SMS",
        contactId: contact.contactId,
        message: opts.body,
        fromNumber: from,
        toNumber: to,
      }),
    });
    const msgJson: any = await msgRes.json().catch(() => ({}));
    if (!msgRes.ok) {
      return {
        ok: false,
        status: msgRes.status,
        error: msgJson?.message || `GHL send failed (${msgRes.status})`,
      };
    }
    return {
      ok: true,
      messageId: msgJson?.messageId || msgJson?.id,
      conversationId: msgJson?.conversationId,
      to,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error calling GHL" };
  }
}

/**
 * Send an email via GoHighLevel's Conversations API using the sub-account's
 * configured email provider. This is for proposal delivery and CRM threading;
 * it is separate from Supabase Auth SMTP, which still requires SMTP settings.
 */
export async function sendEmailViaGHL(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromEmail?: string;
  contactName?: string;
  contactPhone?: string | null;
  language?: string;
  tags?: string[];
}): Promise<GhlEmailResult> {
  const token = process.env.GHL_API_TOKEN;
  const fromEmail = opts.fromEmail || process.env.GHL_EMAIL_FROM || process.env.GHL_FROM_EMAIL || "noreply@suddenimpactagency.io";

  if (!token || !process.env.GHL_LOCATION_ID || !fromEmail) {
    return {
      ok: false,
      error: "GHL email not configured (missing GHL_API_TOKEN/GHL_LOCATION_ID)",
    };
  }

  const to = opts.to.toLowerCase().trim();

  try {
    const contact = await upsertGhlContact({
      email: to,
      phone: opts.contactPhone,
      name: opts.contactName,
      language: opts.language,
      tags: opts.tags,
    });
    if (!contact.ok) return contact;

    const msgRes = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: ghlHeaders(token),
      body: JSON.stringify({
        type: "Email",
        contactId: contact.contactId,
        emailFrom: fromEmail,
        emailTo: to,
        subject: opts.subject,
        html: opts.html,
        message: opts.text || opts.subject,
      }),
    });
    const msgJson: any = await msgRes.json().catch(() => ({}));
    if (!msgRes.ok) {
      return {
        ok: false,
        status: msgRes.status,
        error: msgJson?.message || `GHL email send failed (${msgRes.status})`,
      };
    }

    return {
      ok: true,
      messageId: msgJson?.messageId || msgJson?.id,
      emailMessageId: msgJson?.emailMessageId,
      conversationId: msgJson?.conversationId,
      to,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error calling GHL email" };
  }
}
