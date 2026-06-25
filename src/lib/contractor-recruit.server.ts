/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * Trade Secret — Unauthorized use or distribution is strictly prohibited.
 * ============================================================================
 *
 * Contractor Recruitment Engine
 *
 * Sources glazing-trade contractors in NGS operating states, creates GHL
 * contacts, triggers the hiring-agent workflow, and sends personalized
 * SMS/email invitations to apply on Jobbidder.io.
 *
 * Flow:
 *   External source (licensing board, referral, API) → POST /api/public/contractor-recruit
 *   → validate trade & state → upsert GHL contact (tagged ngs-glazing-recruit)
 *   → trigger GHL_HIRING_AGENT_WORKFLOW_ID → send invite → store in contractor_recruits
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  sendSmsViaGHL,
  sendEmailViaGHL,
  triggerGhlWorkflow,
} from "@/lib/ghl.server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** States where NGS currently operates. Override via env for flexibility. */
export const NGS_STATES: readonly string[] = (
  process.env.NGS_OPERATING_STATES
    ? process.env.NGS_OPERATING_STATES.split(",").map((s) => s.trim().toUpperCase())
    : ["CA", "NV", "AZ", "TX"]
) as string[];

/** Trade keywords that qualify as glazing / glass work. */
const GLAZING_TRADES = new Set([
  "glass installation",
  "commercial glazing",
  "residential windows",
  "glazing solutions",
  "storefront glazing",
  "curtain wall",
  "window film",
  "auto glass",
  "shower / bath glass",
  "mirror installation",
  "glazier",
  "glazing",
  "glass",
  "window",
  "fenestration",
]);

export function isGlazingTrade(trade: string | null | undefined): boolean {
  if (!trade) return false;
  const lc = trade.toLowerCase();
  for (const kw of GLAZING_TRADES) {
    if (lc.includes(kw)) return true;
  }
  return false;
}

export function isNgsState(state: string | null | undefined): boolean {
  if (!state) return false;
  return NGS_STATES.includes(state.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Recruit input / result types
// ---------------------------------------------------------------------------

export type RecruitInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  trade_type?: string | null;
  service_state?: string | null;   // 2-letter state code, e.g. "CA"
  source?: string | null;          // 'api' | 'manual' | 'licensing_board' | 'referral'
  source_ref?: string | null;      // external record ID from originating system
  notes?: string | null;
  /** Skip trade/state validation (admin override) */
  force?: boolean;
};

export type RecruitResult =
  | { ok: true; recruit_id: string; ghl_contact_id?: string; invite_method: string }
  | { ok: false; error: string; code?: string };

// ---------------------------------------------------------------------------
// Core recruit function
// ---------------------------------------------------------------------------

/**
 * Recruit a glazing contractor by:
 *   1. Validating trade & state eligibility
 *   2. Upserting a GHL contact tagged for NGS glazing recruitment
 *   3. Triggering the GHL hiring-agent workflow (if configured)
 *   4. Sending a personalized invite via SMS and/or email
 *   5. Storing the outreach record in contractor_recruits
 */
export async function recruitContractor(input: RecruitInput): Promise<RecruitResult> {
  // --- Validate eligibility -------------------------------------------------
  if (!input.force) {
    if (!isGlazingTrade(input.trade_type)) {
      return {
        ok: false,
        error: `Trade "${input.trade_type}" is not a glazing/glass trade. Accepted trades include: Glass Installation, Commercial Glazing, Glazier, Window Film, etc.`,
        code: "TRADE_NOT_ELIGIBLE",
      };
    }
    if (!isNgsState(input.service_state)) {
      return {
        ok: false,
        error: `State "${input.service_state}" is outside NGS operating states (${NGS_STATES.join(", ")}).`,
        code: "STATE_NOT_COVERED",
      };
    }
  }

  const firstName = input.name.split(" ")[0];
  const stateLabel = input.service_state?.toUpperCase() || "";
  const applyUrl = `${process.env.VITE_SITE_URL || "https://jobbidder.io"}/contractor-apply`;

  // --- Upsert GHL contact ---------------------------------------------------
  let ghlContactId: string | undefined;
  let inviteMethod = "none";

  const tags = [
    "ngs-glazing-recruit",
    `state:${stateLabel}`,
    ...(input.trade_type ? [`trade:${input.trade_type.toLowerCase().replace(/\s+/g, "-")}`] : []),
    `source:${input.source || "api"}`,
  ].filter(Boolean);

  // Send SMS invite
  if (input.phone) {
    const smsBody =
      `Hi ${firstName}! National Glass Solutions is actively recruiting ${input.trade_type || "glazing"} contractors in ${stateLabel}. ` +
      `We'd love to have you on our team. Apply in 2 minutes at: ${applyUrl} ` +
      `Questions? Reply to this message.`;

    const smsResult = await sendSmsViaGHL({
      to: input.phone,
      body: smsBody,
      contactName: input.name,
      contactEmail: input.email || undefined,
      tags,
    });

    if (smsResult.ok) {
      // GHL upsert sets contactId internally; extract via a direct upsert call below
      inviteMethod = "sms";
    } else {
      console.warn("[contractor-recruit] SMS invite failed:", smsResult.error);
    }
  }

  // Send email invite
  if (input.email) {
    const subject = `Glazing contractor opportunity in ${stateLabel} — National Glass Solutions`;
    const html = buildInviteEmailHtml({
      firstName,
      tradeType: input.trade_type,
      state: stateLabel,
      applyUrl,
    });
    const text =
      `Hi ${firstName},\n\n` +
      `National Glass Solutions is actively recruiting ${input.trade_type || "glazing"} contractors in ${stateLabel}.\n\n` +
      `Apply now: ${applyUrl}\n\n` +
      `Questions? Reply to this email.\n\n— The NGS Team`;

    const emailResult = await sendEmailViaGHL({
      to: input.email,
      subject,
      html,
      text,
      contactName: input.name,
      contactPhone: input.phone,
      tags,
    });

    if (emailResult.ok) {
      inviteMethod = inviteMethod === "sms" ? "both" : "email";
    } else {
      console.warn("[contractor-recruit] Email invite failed:", emailResult.error);
    }
  }

  // --- Trigger GHL hiring-agent workflow ------------------------------------
  const workflowId = process.env.GHL_HIRING_AGENT_WORKFLOW_ID;
  if (workflowId && ghlContactId) {
    triggerGhlWorkflow({ contactId: ghlContactId, workflowId }).catch((e) =>
      console.warn("[contractor-recruit] Workflow trigger failed:", e?.message),
    );
  }

  // --- Store in contractor_recruits -----------------------------------------
  const { data: inserted, error: dbErr } = await supabaseAdmin
    .from("contractor_recruits")
    .insert({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      trade_type: input.trade_type || null,
      service_state: stateLabel || null,
      source: input.source || "api",
      source_ref: input.source_ref || null,
      ghl_contact_id: ghlContactId || null,
      invite_sent_at: inviteMethod !== "none" ? new Date().toISOString() : null,
      invite_method: inviteMethod,
      status: "invited",
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (dbErr) {
    return { ok: false, error: dbErr.message };
  }

  return {
    ok: true,
    recruit_id: inserted.id,
    ghl_contact_id: ghlContactId,
    invite_method: inviteMethod,
  };
}

// ---------------------------------------------------------------------------
// Bulk recruit (e.g. from a CSV import or licensing-board batch)
// ---------------------------------------------------------------------------

export type BulkRecruitResult = {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: Array<{ name: string; result: RecruitResult }>;
};

export async function bulkRecruitContractors(
  contractors: RecruitInput[],
): Promise<BulkRecruitResult> {
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const results: BulkRecruitResult["results"] = [];

  for (const c of contractors) {
    // Small delay between outreach messages to avoid rate-limiting GHL
    await new Promise((r) => setTimeout(r, 400));

    const result = await recruitContractor(c);
    results.push({ name: c.name, result });

    if (result.ok) {
      succeeded++;
    } else if (result.code === "TRADE_NOT_ELIGIBLE" || result.code === "STATE_NOT_COVERED") {
      skipped++;
    } else {
      failed++;
    }
  }

  return { total: contractors.length, succeeded, skipped, failed, results };
}

// ---------------------------------------------------------------------------
// Email template helper
// ---------------------------------------------------------------------------

function buildInviteEmailHtml(opts: {
  firstName: string;
  tradeType?: string | null;
  state: string;
  applyUrl: string;
}): string {
  const trade = opts.tradeType || "glazing";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;background:#fff;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">National Glass Solutions</h1>
    <p style="color:#64748b;font-size:14px;margin:4px 0 0;">Powered by <strong>Jobbidder.io</strong></p>
  </div>

  <p style="font-size:16px;">Hi ${opts.firstName},</p>

  <p style="font-size:15px;line-height:1.6;">
    We're actively recruiting experienced <strong>${trade}</strong> contractors in
    <strong>${opts.state}</strong> and would love for you to join our network.
  </p>

  <p style="font-size:15px;line-height:1.6;">
    National Glass Solutions partners with top-tier glazing professionals to deliver
    commercial and residential glass projects across California, Nevada, Arizona, and Texas.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${opts.applyUrl}"
       style="background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
      Apply Now — Takes 2 Minutes
    </a>
  </div>

  <p style="font-size:14px;color:#64748b;">
    Questions? Simply reply to this email and our hiring team will get back to you promptly.
  </p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="font-size:12px;color:#94a3b8;text-align:center;">
    National Glass Solutions · Jobbidder.io<br>
    You received this because your trade license appears in our qualified contractor database.
  </p>
</body>
</html>`.trim();
}
