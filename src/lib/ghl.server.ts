import { toE164US } from "./twilio.server";

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

function resolveGhlConfig(credentials?: GhlCredentials | null): GhlRuntimeConfig | null {
  const platformToken = clean(process.env.GHL_API_TOKEN);
  const platformLocationId = clean(process.env.GHL_LOCATION_ID);
  const contractorToken = clean(credentials?.apiToken);
  const contractorLocationId = clean(credentials?.locationId);

  // Production emergency safety: prefer the centrally managed Vercel token when
  // it is present. Contractor rows can contain stale private-integration tokens,
  // while the environment token can be rotated immediately without direct DB
  // access. If GHL_LOCATION_ID is not configured in Vercel, pair the platform
  // token with the contractor's existing location ID so delivery can be restored
  // without waiting for a second secret update.
  if (platformToken && (platformLocationId || contractorLocationId)) {
    return {
      token: platformToken,
      locationId: platformLocationId || contractorLocationId!,
      fromNumber: clean(process.env.GHL_FROM_NUMBER) || clean(credentials?.fromNumber) || undefined,
      fromEmail: clean(process.env.GHL_EMAIL_FROM) || clean(process.env.GHL_FROM_EMAIL) || clean(credentials?.fromEmail) || undefined,
      source: "platform",
    };
  }

  if (contractorToken && contractorLocationId) {
    return {
      token: contractorToken,
      locationId: contractorLocationId,
      fromNumber: clean(credentials?.fromNumber) || undefined,
      fromEmail: clean(credentials?.fromEmail) || undefined,
      source: "contractor",
    };
  }

  return null;
}

function ghlHeaders(token: string) {
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
      error: "GHL not configured (missing contractor or platform GHL_API_TOKEN/GHL_LOCATION_ID)",
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
 * Send an SMS via GoHighLevel's Conversations API. Production first uses the
 * centrally managed GHL environment token when configured, allowing an invalid
 * contractor token to be rotated immediately. If the environment token is not
 * present, contractor-owned credentials are used as a fallback.
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
      error: "GHL not configured (missing contractor or platform GHL token/location/from number)",
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
 * Send an email via GoHighLevel's Conversations API. Production first uses the
 * centrally managed GHL environment token when configured, allowing an invalid
 * contractor token to be rotated immediately. If the environment token is not
 * present, contractor-owned credentials are used as a fallback.
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
  credentials?: GhlCredentials | null;
}): Promise<GhlEmailResult> {
  const config = resolveGhlConfig(opts.credentials);
  const fromEmail = opts.fromEmail || config?.fromEmail || "noreply@suddenimpactagency.io";

  if (!config || !fromEmail) {
    return {
      ok: false,
      error: "GHL email not configured (missing contractor or platform GHL token/location/from email)",
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
