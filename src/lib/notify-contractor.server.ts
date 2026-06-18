import * as React from "react";
import { render } from "@react-email/components";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL } from "@/lib/ghl.server";
import { sendSms } from "@/lib/twilio.server";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Jobbidder";
const SENDER_DOMAIN = "notify.suddenimpactagency.io";
const FROM_DOMAIN = "suddenimpactagency.io";

function genToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function ensureUnsubToken(email: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", email)
    .maybeSingle();
  if (existing?.used_at) return null;
  if (existing?.token) return existing.token;
  const t = genToken();
  await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .upsert({ email, token: t }, { onConflict: "email" });
  return t;
}

export async function notifyContractorOfDecision(opts: {
  proposalId: string;
  decision: "accepted" | "declined";
  totalAmount?: number | null;
  signerName?: string | null;
  declineReason?: string | null;
}) {
  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("id, client_name, client_phone, job_address, proposal_number, contractor_id, selected_tier")
    .eq("id", opts.proposalId)
    .maybeSingle();
  if (!proposal) return { ok: false, error: "proposal not found" };

  const { data: contractor } = proposal.contractor_id
    ? await supabaseAdmin
        .from("contractors")
        .select("business_name, email, phone")
        .eq("id", proposal.contractor_id)
        .maybeSingle()
    : { data: null as { business_name: string | null; email: string | null; phone: string | null } | null };

  const business = contractor?.business_name || "your business";
  const totalStr =
    typeof opts.totalAmount === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(opts.totalAmount)
      : null;

  const verb = opts.decision === "accepted" ? "ACCEPTED" : "DECLINED";
  const smsBody =
    opts.decision === "accepted"
      ? `✅ Proposal ${proposal.proposal_number} ${verb} by ${proposal.client_name}${totalStr ? ` for ${totalStr}` : ""}. Job: ${proposal.job_address || "(no address)"}. Call ${proposal.client_phone || "client"} to schedule.`
      : `❌ Proposal ${proposal.proposal_number} ${verb} by ${proposal.client_name}. Job: ${proposal.job_address || "(no address)"}${opts.declineReason ? `. Reason: ${opts.declineReason}` : ""}.`;

  // SMS — try GHL first, fall back to Twilio.
  let smsRes: any = { skipped: "no contractor phone" };
  if (contractor?.phone) {
    smsRes = await sendSmsViaGHL({ to: contractor.phone, body: smsBody });
    if (!smsRes.ok) {
      const tw = await sendSms({ to: contractor.phone, body: smsBody });
      if (tw.ok) smsRes = tw;
    }
  }

  // Email
  let emailRes: any = { skipped: "no contractor email" };
  if (contractor?.email) {
    const normalized = contractor.email.toLowerCase().trim();
    const template = TEMPLATES["proposal-decision"];
    if (template) {
      const data = {
        decision: opts.decision,
        businessName: business,
        clientName: proposal.client_name,
        proposalNumber: proposal.proposal_number,
        proposalId: proposal.id,
        jobAddress: proposal.job_address,
        totalAmount: totalStr,
        signerName: opts.signerName,
        declineReason: opts.declineReason,
        selectedTier: proposal.selected_tier,
      };
      const html = await render(React.createElement(template.component, data));
      const text = await render(React.createElement(template.component, data), { plainText: true });
      const subject =
        typeof template.subject === "function" ? template.subject(data) : template.subject;
      const token = await ensureUnsubToken(normalized);
      const messageId = crypto.randomUUID();
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "proposal-decision",
        recipient_email: normalized,
        status: "pending",
      });
      const { error } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: normalized,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: "transactional",
          label: "proposal-decision",
          idempotency_key: `decision-${proposal.id}-${opts.decision}-${Date.now()}`,
          unsubscribe_token: token || undefined,
          queued_at: new Date().toISOString(),
        },
      });
      emailRes = error ? { ok: false, error: error.message } : { ok: true, message_id: messageId };
    } else {
      emailRes = { ok: false, error: "template missing" };
    }
  }

  return { ok: true, sms: smsRes, email: emailRes };
}