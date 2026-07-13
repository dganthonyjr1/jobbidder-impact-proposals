import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { followupMessage } from "@/lib/followups.server";
import { sendSmsViaGHL } from "@/lib/ghl.server";

const SITE_NAME = "Jobbidder";
const SENDER_DOMAIN = "notify.jobbidder.io";
const FROM_DOMAIN = "jobbidder.io";

function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function ensureUnsubToken(email: string): Promise<string | null> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("email_unsubscribe_tokens").select("token, used_at").eq("email", email).maybeSingle();
  if (existingError) console.error("[process-followups] Unsubscribe token lookup failed:", existingError.message);
  if (existing?.used_at) return null;
  if (existing?.token) return existing.token;
  const t = genToken();
  await supabaseAdmin.from("email_unsubscribe_tokens").upsert({ email, token: t }, { onConflict: "email" });
  return t;
}

async function enqueueFollowupEmail(opts: { to: string; subject: string; html: string; followupId: string }) {
  const normalized = opts.to.toLowerCase().trim();
  const { data: suppressed, error: suppressedError } = await supabaseAdmin
    .from("suppressed_emails").select("email").eq("email", normalized).maybeSingle();
  if (suppressedError) console.error("[process-followups] Suppression check failed:", suppressedError.message);
  if (suppressed) return { skipped: "suppressed" };
  const token = await ensureUnsubToken(normalized);
  if (!token) return { skipped: "unsubscribed" };

  const messageId = crypto.randomUUID();
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId, template_name: "proposal-followup",
    recipient_email: normalized, status: "pending",
  });
  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: normalized,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: opts.subject,
      html: opts.html,
      text: opts.html.replace(/<[^>]+>/g, ""),
      purpose: "transactional",
      label: "proposal-followup",
      idempotency_key: `followup-${opts.followupId}`,
      unsubscribe_token: token,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) return { error: error.message };
  return { queued: true, message_id: messageId };
}

export const Route = createFileRoute("/api/public/hooks/process-followups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        // Pick up to 50 pending follow-ups that are due
        const { data: due, error } = await supabaseAdmin
          .from("proposal_followups")
          .select("id, proposal_id, step, channels, scheduled_at")
          .eq("status", "pending")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(50);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!due || due.length === 0) return Response.json({ ok: true, processed: 0 });

        const results: any[] = [];
        for (const row of due) {
          // Load proposal + contractor
          const { data: proposal, error: proposalError } = await supabaseAdmin
            .from("proposals")
            .select("id, client_name, client_email, client_phone, status, contractor_id, proposal_number")
            .eq("id", row.proposal_id)
            .maybeSingle();
          if (proposalError) console.error("[process-followups] Proposal lookup failed:", proposalError.message);
          if (!proposal) {
            await supabaseAdmin.from("proposal_followups").update({
              status: "cancelled", error: "proposal missing",
            }).eq("id", row.id);
            continue;
          }
          // Skip & cancel if proposal already finalized
          if (["accepted", "expired", "declined", "deposit_paid"].includes(proposal.status)) {
            await supabaseAdmin.from("proposal_followups").update({ status: "cancelled" }).eq("id", row.id);
            continue;
          }

          const { data: contractor } = proposal.contractor_id
            ? await supabaseAdmin
                .from("contractors").select("business_name").eq("id", proposal.contractor_id).maybeSingle()
            : { data: null as { business_name: string | null } | null };
          const business = contractor?.business_name || "your contractor";
          const proposalUrl = `${origin}/p/${proposal.id}`;
          const msg = followupMessage(row.step as "24h" | "72h" | "7d", {
            clientName: proposal.client_name, business, url: proposalUrl,
          });

          let emailRes: any = null;
          let smsRes: any = null;
          if ((row.channels === "email" || row.channels === "both") && proposal.client_email) {
            emailRes = await enqueueFollowupEmail({
              to: proposal.client_email, subject: msg.subject, html: msg.html, followupId: row.id,
            });
          }
          if ((row.channels === "sms" || row.channels === "both") && proposal.client_phone) {
            try {
              smsRes = await sendSmsViaGHL({ to: proposal.client_phone, body: msg.sms });
            } catch (e: any) {
              smsRes = { ok: false, error: e?.message };
            }
          }

          const failed = (emailRes && emailRes.error) || (smsRes && smsRes.ok === false);
          await supabaseAdmin.from("proposal_followups").update({
            status: failed ? "failed" : "sent",
            sent_at: new Date().toISOString(),
            error: failed ? JSON.stringify({ email: emailRes, sms: smsRes }).slice(0, 500) : null,
          }).eq("id", row.id);

          results.push({ id: row.id, step: row.step, email: emailRes, sms: smsRes });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to process due follow-ups" }),
    },
  },
});