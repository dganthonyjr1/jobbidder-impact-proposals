/**
 * NetSuite CRM integration — DARK / NOT YET LIVE.
 *
 * This module is written against NetSuite's publicly documented REST Record
 * API and Token-Based Authentication (TBA / OAuth 1.0a) spec, which is the
 * same across every NetSuite account for standard record types. It has
 * NEVER been tested against a real NetSuite account, because we don't have
 * one yet.
 *
 * Known risk areas that will likely need adjusting once tested against a
 * real account (flagged inline below):
 *   1. Most companies customize Opportunity/CRM fields and status lists —
 *      the "entitystatus" (pipeline stage) internal IDs are account-specific
 *      customizations, so this deliberately does NOT try to guess them.
 *      Stage changes are recorded as a memo note instead of a status change
 *      until real status IDs are confirmed.
 *   2. Whether the account tracks "customer" as the right entity type for
 *      a homeowner/client (vs. a custom record type) is unverified.
 *
 * This is intentionally not exposed anywhere in the Settings UI yet.
 * netsuite_sync_enabled defaults to false and nothing in the product turns
 * it on — it only activates once real credentials are set directly in the
 * database after a live test.
 */

import { createHmac, randomBytes } from "node:crypto";

export type NetsuiteCredentials = {
  accountId?: string | null;
  consumerKey?: string | null;
  consumerSecret?: string | null;
  tokenId?: string | null;
  tokenSecret?: string | null;
  syncEnabled?: boolean | null;
};

type NetsuiteResult<T> = { ok: true } & T | { ok: false; error: string };

function clean(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

type NetsuiteConfig = {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  domain: string;
  realm: string;
};

function resolveNetsuiteConfig(credentials?: NetsuiteCredentials | null): NetsuiteConfig | null {
  if (!credentials?.syncEnabled) return null;
  const accountId = clean(credentials.accountId);
  const consumerKey = clean(credentials.consumerKey);
  const consumerSecret = clean(credentials.consumerSecret);
  const tokenId = clean(credentials.tokenId);
  const tokenSecret = clean(credentials.tokenSecret);
  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) return null;

  return {
    accountId,
    consumerKey,
    consumerSecret,
    tokenId,
    tokenSecret,
    domain: `${accountId.toLowerCase().replace(/_/g, "-")}.suitetalk.api.netsuite.com`,
    realm: accountId.toUpperCase(),
  };
}

// RFC 3986 percent-encoding — encodeURIComponent doesn't escape !*'() but OAuth 1.0a requires it.
function rfc3986Encode(str: string): string {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildAuthHeader(method: string, url: string, config: NetsuiteConfig): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_token: config.tokenId,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };

  const paramString = Object.entries(oauthParams)
    .map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`)
    .sort()
    .join("&");

  const baseString = `${method.toUpperCase()}&${rfc3986Encode(url)}&${rfc3986Encode(paramString)}`;
  const signingKey = `${rfc3986Encode(config.consumerSecret)}&${rfc3986Encode(config.tokenSecret)}`;
  const signature = createHmac("sha256", signingKey).update(baseString).digest("base64");

  const headerParams = { ...oauthParams, oauth_signature: signature };
  const headerString = Object.entries(headerParams)
    .map(([k, v]) => `${k}="${rfc3986Encode(v)}"`)
    .join(", ");

  return `OAuth realm="${config.realm}", ${headerString}`;
}

async function netsuiteRequest(
  path: string,
  method: string,
  config: NetsuiteConfig,
  body?: unknown,
): Promise<{ res: Response; json: any; location: string | null }> {
  const url = `https://${config.domain}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: buildAuthHeader(method, url, config),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(path.includes("/query/") ? { Prefer: "transient" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const location = res.headers.get("location");
  const json: any = await res.json().catch(() => ({}));
  return { res, json, location };
}

function idFromLocation(location: string | null): string | null {
  if (!location) return null;
  const parts = location.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

async function findNetsuiteCustomerByEmail(email: string, config: NetsuiteConfig): Promise<string | null> {
  const { res, json } = await netsuiteRequest("/services/rest/query/v1/suiteql", "POST", config, {
    q: `SELECT id FROM customer WHERE email = '${escapeSql(email.toLowerCase().trim())}'`,
  });
  if (!res.ok) return null;
  const id: string | undefined = json?.items?.[0]?.id;
  return id ? String(id) : null;
}

export async function upsertNetsuiteCustomer(opts: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  credentials?: NetsuiteCredentials | null;
}): Promise<NetsuiteResult<{ customerId: string }>> {
  const config = resolveNetsuiteConfig(opts.credentials);
  if (!config) return { ok: false, error: "NetSuite not configured" };

  const email = clean(opts.email)?.toLowerCase() || null;
  const phone = clean(opts.phone);
  const name = clean(opts.name);
  if (!email && !phone) return { ok: false, error: "NetSuite customer requires email or phone" };

  if (email) {
    const existingId = await findNetsuiteCustomerByEmail(email, config);
    if (existingId) return { ok: true, customerId: existingId };
  }

  const properties: Record<string, unknown> = {};
  if (email) properties.email = email;
  if (phone) properties.phone = phone;
  if (name) properties.companyName = name;

  const { res, json, location } = await netsuiteRequest("/services/rest/record/v1/customer", "POST", config, properties);
  if (!res.ok) return { ok: false, error: json?.["o:errorDetails"]?.[0]?.detail || `NetSuite customer create failed (${res.status})` };
  const customerId = idFromLocation(location) || (json?.id ? String(json.id) : null);
  if (!customerId) return { ok: false, error: "NetSuite create returned no customer id" };
  return { ok: true, customerId };
}

export async function createNetsuiteOpportunity(opts: {
  title: string;
  memo?: string | null;
  customerId: string;
  credentials?: NetsuiteCredentials | null;
}): Promise<NetsuiteResult<{ opportunityId: string }>> {
  const config = resolveNetsuiteConfig(opts.credentials);
  if (!config) return { ok: false, error: "NetSuite not configured" };

  const properties: Record<string, unknown> = {
    title: opts.title,
    entity: { id: opts.customerId },
  };
  if (opts.memo) properties.memo = opts.memo;

  const { res, json, location } = await netsuiteRequest("/services/rest/record/v1/opportunity", "POST", config, properties);
  if (!res.ok) return { ok: false, error: json?.["o:errorDetails"]?.[0]?.detail || `NetSuite opportunity create failed (${res.status})` };
  const opportunityId = idFromLocation(location) || (json?.id ? String(json.id) : null);
  if (!opportunityId) return { ok: false, error: "NetSuite create returned no opportunity id" };
  return { ok: true, opportunityId };
}

/**
 * Records a lifecycle change as a memo note rather than an entitystatus
 * change — the actual pipeline-stage internal IDs are account-specific
 * customizations we haven't confirmed yet. Safe to call blind; a wrong
 * memo is just a note, a wrong status ID could silently misfile the deal.
 */
export async function noteNetsuiteOpportunity(opts: {
  opportunityId: string;
  memo: string;
  credentials?: NetsuiteCredentials | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = resolveNetsuiteConfig(opts.credentials);
  if (!config) return { ok: false, error: "NetSuite not configured" };

  const { res, json } = await netsuiteRequest(`/services/rest/record/v1/opportunity/${opts.opportunityId}`, "PATCH", config, {
    memo: opts.memo,
  });
  if (!res.ok) return { ok: false, error: json?.["o:errorDetails"]?.[0]?.detail || `NetSuite opportunity update failed (${res.status})` };
  return { ok: true };
}

export async function syncNewProposalToNetsuite(opts: {
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  dealTitle: string;
  memo?: string | null;
  credentials?: NetsuiteCredentials | null;
}): Promise<string | null> {
  const config = resolveNetsuiteConfig(opts.credentials);
  if (!config) return null;

  try {
    const customer = await upsertNetsuiteCustomer({
      email: opts.clientEmail,
      phone: opts.clientPhone,
      name: opts.clientName,
      credentials: opts.credentials,
    });
    if (!customer.ok) {
      console.error("[netsuite] customer upsert failed:", customer.error);
      return null;
    }
    const opportunity = await createNetsuiteOpportunity({
      title: opts.dealTitle,
      memo: opts.memo,
      customerId: customer.customerId,
      credentials: opts.credentials,
    });
    if (!opportunity.ok) {
      console.error("[netsuite] opportunity create failed:", opportunity.error);
      return null;
    }
    return opportunity.opportunityId;
  } catch (e) {
    console.error("[netsuite] sync failed:", (e as Error).message);
    return null;
  }
}
