/**
 * Contractor portal — magic-link auth.
 *
 * Contractors have no password. They enter the email or phone on their
 * application, we text/email them a signed link, and clicking it proves
 * ownership. Tokens are stateless HMACs (no extra DB table): they carry the
 * application id + expiry and are verified server-side.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  return (
    process.env.CONTRACTOR_PORTAL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "jobbidder-dev-portal-secret"
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Create a portal token for an application id, valid for TOKEN_TTL_MS. */
export function signPortalToken(applicationId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${b64url(applicationId)}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a portal token; returns the application id if valid + unexpired, else null. */
export function verifyPortalToken(token: string | null | undefined): { applicationId: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idB64, expStr, sig] = parts;
  const payload = `${idB64}.${expStr}`;
  const expected = sign(payload);

  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  try {
    const applicationId = Buffer.from(idB64, "base64url").toString("utf8");
    if (!applicationId) return null;
    return { applicationId };
  } catch {
    return null;
  }
}
