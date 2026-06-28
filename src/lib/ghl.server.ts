import { toE164US } from "./twilio.server";

/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary GHL integration logic and trade secrets
 * protected by:
 * - U.S. Patent Application (Provisional) - June 23, 2026
 * - Copyright Law
 * - Trade Secret Protection
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

export type GhlSmsResult =
  | { ok: true; messageId?: string; conversationId?: string; to: string }
  | { ok: false; error: string; status?: number };

export type GhlEmailResult =
  | { ok: true; messageId?: string; emailMessageId?: string; conversationId?: string; to: string }
  | { ok: false; error: string; status?: number };

export type GhlCredentials = {
  apiToken?: string | null;
  locationId?: string | null;
  fromNumber?: string | null;
  fromEmail?: string | null;
};

type GhlRuntimeConfig = {
  token: string;
  locationId: string;
  fromNumber?: string;
  fromEmail?: string;
  source: "contractor" | "platform";
};

type GhlContactInput = {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  language?: string | null;
  tags?: string[] | null;
  credentials?: GhlCredentials | null;
};

type GhlContactResult =
  | { ok: true; contactId: string }
  | { ok: false; error: string; status?: number };

function clean(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

/**
 * Resolve GHL configuration with proper priority:
 * 1. Contractor-provided credentials (highest priority - always use if valid)
 * 2. Platform environment variables (fallback only)
 * 
 * This ensures that contractor tokens work immediately without database lookups,
 * and contractor tokens are never overridden by stale platform credentials.
 */
function resolveGhlConfig(credentials?: GhlCredentials | null): GhlRuntimeConfig | null {
  const contractorToken = clean(credentials?.apiToken);
  const contractorLocationId = clean(credentials?.locationId);
  
  // PRIORITY 1: Use contractor credentials if both token and location are provided
  if (contractorToken && contractorLocationId) {
    return {
      token: contractorToken,
      locationId: contractorLocationId,
      fromNumber: clean(credentials?.fromNumber) || undefined,
      fromEmail: clean(credentials?.fromEmail) || undefined,
      source: "contractor",
    };
  }

  // PRIORITY 2: Fall back to platform environment variables
  const platformToken = clean(process.env.GHL_API_TOKEN);
  const platformLocationId = clean(process.env.GHL_LOCATION_ID);
  
  if (platformToken && platformLocationId) {
    return {
      token: platformToken,
      locationId: platformLocationId,
      fromNumber: clean(process.env.GHL_FROM_NUMBER) || undefined,
      fromEmail: clean(process.env.GHL_EMAIL_FROM) || clean(process.env.GHL_FROM_EMAIL) || undefined,
      source: "platform",
    };
  }

  // No valid configuration found
  return null;
}

function ghlHeaders(token: string) {
  // GHL supports both OAuth tokens (sk_live_) and Private Integration tokens (pit_)
  // Both use Bearer authentication
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-04-15",
  };
}

async function upsertGhlContact(input: GhlContactInput): Promise<GhlContactResult> {
  const config = resolveGhlConfig(input.credentials);

  if (!config) {
    return {
      ok: false,
      error: "GHL not configured (missing valid credentials)",
    };
  }

  const body: Record<string, unknown> = { locationId: config.locationId };
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
    headers: ghlHeaders(config.token),
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
      headers: ghlHeaders(config.token),
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
 * Send an SMS via GoHighLevel's Conversations API.
 * Uses contractor credentials if provided, otherwise falls back to platform credentials.
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
  credentials?: GhlCredentials | null;
}): Promise<GhlSmsResult> {
  const config = resolveGhlConfig(opts.credentials);
  const fromNumber = opts.fromNumber || config?.fromNumber;

  if (!config || !fromNumber) {
    return {
      ok: false,
      error: "GHL SMS not configured (missing credentials or from number)",
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
      credentials: opts.credentials,
    });
    if (!contact.ok) return contact;

    const msgRes = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: ghlHeaders(config.token),
      body: JSON.stringify({
        type: "SMS",
        locationId: config.locationId,
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
        error: msgJson?.message || `GHL SMS send failed (${msgRes.status})`,
      };
    }
    return {
      ok: true,
      messageId: msgJson?.messageId || msgJson?.id,
      conversationId: msgJson?.conversationId,
      to,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error calling GHL SMS" };
  }
}

export async function addGhlContactTags(opts: {
  contactId: string;
  tags: string[];
  credentials?: GhlCredentials | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = resolveGhlConfig(opts.credentials);
  if (!config) return { ok: false, error: "GHL not configured" };

  const res = await fetch(
    `https://services.leadconnectorhq.com/contacts/${opts.contactId}/tags`,
    {
      method: "POST",
      headers: { ...ghlHeaders(config.token), Version: "2021-07-28" },
      body: JSON.stringify({ tags: opts.tags }),
    },
  );
  if (!res.ok) {
    const json: any = await res.json().catch(() => ({}));
    return { ok: false, error: json?.message || `GHL add tags failed (${res.status})` };
  }
  return { ok: true };
}

export async function removeGhlContactTags(opts: {
  contactId: string;
  tags: string[];
  credentials?: GhlCredentials | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = resolveGhlConfig(opts.credentials);
  if (!config) return { ok: false, error: "GHL not configured" };

  const res = await fetch(
    `https://services.leadconnectorhq.com/contacts/${opts.contactId}/tags`,
    {
      method: "DELETE",
      headers: { ...ghlHeaders(config.token), Version: "2021-07-28" },
      body: JSON.stringify({ tags: opts.tags }),
    },
  );
  if (!res.ok) {
    const json: any = await res.json().catch(() => ({}));
    return { ok: false, error: json?.message || `GHL remove tags failed (${res.status})` };
  }
  return { ok: true };
}

export async function triggerGhlWorkflow(opts: {
  contactId: string;
  workflowId: string;
  credentials?: GhlCredentials | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = resolveGhlConfig(opts.credentials);
  if (!config) return { ok: false, error: "GHL not configured" };

  const res = await fetch(
    `https://services.leadconnectorhq.com/contacts/${opts.contactId}/workflow/${opts.workflowId}`,
    {
      method: "POST",
      headers: { ...ghlHeaders(config.token), Version: "2021-07-28" },
      body: JSON.stringify({ eventStartTime: new Date().toISOString() }),
    },
  );
  if (!res.ok) {
    const json: any = await res.json().catch(() => ({}));
    return { ok: false, error: json?.message || `GHL workflow trigger failed (${res.status})` };
  }
  return { ok: true };
}

/**
 * Send an email via GoHighLevel's Conversations API.
 * Uses contractor credentials if provided, otherwise falls back to platform credentials.
 */
export async function sendEmailViaGHL(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromEmail?: string;
  replyTo?: string | null;
  contactName?: string;
  contactPhone?: string | null;
  language?: string;
  tags?: string[];
  credentials?: GhlCredentials | null;
}): Promise<GhlEmailResult> {
  const config = resolveGhlConfig(opts.credentials);
  const fromEmail = opts.fromEmail || config?.fromEmail || "noreply@suddenimpactagency.io";

  if (!config) {
    return {
      ok: false,
      error: "GHL email not configured (missing valid credentials)",
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
      credentials: opts.credentials,
    });
    if (!contact.ok) return contact;

    const msgRes = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: ghlHeaders(config.token),
      body: JSON.stringify({
        type: "Email",
        locationId: config.locationId,
        contactId: contact.contactId,
        emailFrom: fromEmail,
        emailTo: to,
        subject: opts.subject,
        html: opts.html || `<p>${opts.text || opts.subject}</p>`,
        message: opts.text || opts.subject,
        ...(opts.replyTo ? { emailReplyTo: opts.replyTo } : {}),
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
