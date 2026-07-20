/**
 * HubSpot CRM integration — contractor-owned only (no platform-level fallback).
 * A contractor pastes their own HubSpot Private App token in Settings; Jobbidder
 * then pushes contacts and deals into that contractor's own HubSpot account.
 *
 * Deal stages below assume HubSpot's default "Sales Pipeline" stage IDs
 * (contractsent / closedwon / closedlost), which exist on every HubSpot
 * portal unless the pipeline has been customized.
 */

export type HubspotCredentials = {
  privateAppToken?: string | null;
  syncEnabled?: boolean | null;
};

export const HUBSPOT_STAGE = {
  created: "contractsent",
  accepted: "closedwon",
  declined: "closedlost",
} as const;

type HubspotResult<T> = { ok: true } & T | { ok: false; error: string };

function clean(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

function resolveHubspotConfig(credentials?: HubspotCredentials | null): { token: string } | null {
  if (!credentials?.syncEnabled) return null;
  const token = clean(credentials.privateAppToken);
  if (!token) return null;
  return { token };
}

async function hubspotFetch(path: string, token: string, init: RequestInit) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const json: any = await res.json().catch(() => ({}));
  return { res, json };
}

/**
 * Upsert a contact by email (HubSpot's batch/upsert endpoint keys on a chosen
 * unique property). Falls back to a plain create when no email is available.
 */
export async function upsertHubspotContact(opts: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  credentials?: HubspotCredentials | null;
}): Promise<HubspotResult<{ contactId: string }>> {
  const config = resolveHubspotConfig(opts.credentials);
  if (!config) return { ok: false, error: "HubSpot not configured" };

  const email = clean(opts.email)?.toLowerCase() || null;
  const phone = clean(opts.phone);
  const [firstname, ...rest] = (opts.name || "").trim().split(/\s+/).filter(Boolean);
  const lastname = rest.join(" ") || undefined;
  const properties: Record<string, string> = {};
  if (email) properties.email = email;
  if (phone) properties.phone = phone;
  if (firstname) properties.firstname = firstname;
  if (lastname) properties.lastname = lastname;

  if (!email && !phone) return { ok: false, error: "HubSpot contact requires email or phone" };

  if (email) {
    const { res, json } = await hubspotFetch("/crm/v3/objects/contacts/batch/upsert", config.token, {
      method: "POST",
      body: JSON.stringify({ inputs: [{ idProperty: "email", id: email, properties }] }),
    });
    if (!res.ok) return { ok: false, error: json?.message || `HubSpot contact upsert failed (${res.status})` };
    const contactId: string | undefined = json?.results?.[0]?.id;
    if (!contactId) return { ok: false, error: "HubSpot upsert returned no contact id" };
    return { ok: true, contactId };
  }

  const { res, json } = await hubspotFetch("/crm/v3/objects/contacts", config.token, {
    method: "POST",
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) return { ok: false, error: json?.message || `HubSpot contact create failed (${res.status})` };
  const contactId: string | undefined = json?.id;
  if (!contactId) return { ok: false, error: "HubSpot create returned no contact id" };
  return { ok: true, contactId };
}

export async function createHubspotDeal(opts: {
  dealName: string;
  amount?: number | null;
  stage: string;
  contactId: string;
  credentials?: HubspotCredentials | null;
}): Promise<HubspotResult<{ dealId: string }>> {
  const config = resolveHubspotConfig(opts.credentials);
  if (!config) return { ok: false, error: "HubSpot not configured" };

  const properties: Record<string, string> = { dealname: opts.dealName, dealstage: opts.stage };
  if (opts.amount != null) properties.amount = String(opts.amount);

  const { res, json } = await hubspotFetch("/crm/v3/objects/deals", config.token, {
    method: "POST",
    body: JSON.stringify({
      properties,
      associations: [
        {
          to: { id: opts.contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        },
      ],
    }),
  });
  if (!res.ok) return { ok: false, error: json?.message || `HubSpot deal create failed (${res.status})` };
  const dealId: string | undefined = json?.id;
  if (!dealId) return { ok: false, error: "HubSpot deal create returned no id" };
  return { ok: true, dealId };
}

export async function updateHubspotDealStage(opts: {
  dealId: string;
  stage: string;
  amount?: number | null;
  credentials?: HubspotCredentials | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = resolveHubspotConfig(opts.credentials);
  if (!config) return { ok: false, error: "HubSpot not configured" };

  const properties: Record<string, string> = { dealstage: opts.stage };
  if (opts.amount != null) properties.amount = String(opts.amount);

  const { res, json } = await hubspotFetch(`/crm/v3/objects/deals/${opts.dealId}`, config.token, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) return { ok: false, error: json?.message || `HubSpot deal update failed (${res.status})` };
  return { ok: true };
}

/**
 * Orchestrates contact upsert + deal creation for a brand-new proposal.
 * Swallows and logs errors — a HubSpot outage must never block proposal creation.
 */
export async function syncNewProposalToHubspot(opts: {
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  dealName: string;
  amount?: number | null;
  credentials?: HubspotCredentials | null;
}): Promise<string | null> {
  const config = resolveHubspotConfig(opts.credentials);
  if (!config) return null;

  try {
    const contact = await upsertHubspotContact({
      email: opts.clientEmail,
      phone: opts.clientPhone,
      name: opts.clientName,
      credentials: opts.credentials,
    });
    if (!contact.ok) {
      console.error("[hubspot] contact upsert failed:", contact.error);
      return null;
    }
    const deal = await createHubspotDeal({
      dealName: opts.dealName,
      amount: opts.amount,
      stage: HUBSPOT_STAGE.created,
      contactId: contact.contactId,
      credentials: opts.credentials,
    });
    if (!deal.ok) {
      console.error("[hubspot] deal create failed:", deal.error);
      return null;
    }
    return deal.dealId;
  } catch (e) {
    console.error("[hubspot] sync failed:", (e as Error).message);
    return null;
  }
}
