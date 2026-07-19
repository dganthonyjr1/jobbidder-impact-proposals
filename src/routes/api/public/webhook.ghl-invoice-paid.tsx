/**
 * POST /api/public/webhook/ghl-invoice-paid
 *
 * GHL invoice payment webhook. Point GHL's "Invoice Paid" (or "Invoice Status
 * Changed") event at this URL. This is the only place deposit_status ever
 * moves from "pending" to "paid" — the client UI must never assume payment
 * succeeded just because a payment tab was opened.
 *
 * Defensive parsing: GHL's exact payload shape varies by webhook version, so
 * we accept several plausible field names for the invoice id and status
 * rather than assuming one exact schema.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL } from "@/lib/ghl.server";

type JsonRecord = Record<string, any>;

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function extractInvoiceId(body: JsonRecord): string | null {
  return (
    body.invoiceId ||
    body.invoice_id ||
    body.invoice?.id ||
    body.invoice?._id ||
    body._id ||
    body.id ||
    null
  );
}

function extractStatus(body: JsonRecord): string {
  return String(
    body.status || body.paymentStatus || body.payment_status || body.invoice?.status || ""
  ).toLowerCase();
}

const PAID_STATUSES = new Set(["paid", "invoice_paid", "payment_completed", "completed"]);

export const Route = createFileRoute("/api/public/webhook/ghl-invoice-paid")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        let body: JsonRecord;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: cors() });
        }

        const invoiceId = extractInvoiceId(body);
        const status = extractStatus(body);

        if (!invoiceId) {
          console.warn("[webhook.ghl-invoice-paid] No invoice id in payload:", JSON.stringify(body).slice(0, 500));
          return Response.json({ ok: true, skipped: "no invoice id" }, { headers: cors() });
        }

        if (!PAID_STATUSES.has(status)) {
          // Not a "paid" event (could be sent/viewed/void) — nothing to do.
          return Response.json({ ok: true, skipped: `status=${status || "unknown"}` }, { headers: cors() });
        }

        const { data: proposal, error: lookupError } = await supabaseAdmin
          .from("proposals")
          .select("id, proposal_number, contractor_id, deposit_amount, deposit_status, client_name")
          .eq("deposit_invoice_id", invoiceId)
          .maybeSingle();

        if (lookupError) {
          console.error("[webhook.ghl-invoice-paid] Proposal lookup failed:", lookupError.message);
          return Response.json({ ok: false, error: lookupError.message }, { status: 500, headers: cors() });
        }
        if (!proposal) {
          console.warn("[webhook.ghl-invoice-paid] No proposal found for invoice id:", invoiceId);
          return Response.json({ ok: true, skipped: "no matching proposal" }, { headers: cors() });
        }
        if (proposal.deposit_status === "paid") {
          // Already recorded — GHL can send duplicate webhook deliveries.
          return Response.json({ ok: true, skipped: "already paid" }, { headers: cors() });
        }

        const { error: updateError } = await supabaseAdmin
          .from("proposals")
          .update({ deposit_status: "paid" })
          .eq("id", proposal.id);
        if (updateError) {
          console.error("[webhook.ghl-invoice-paid] Failed to mark deposit paid:", updateError.message);
          return Response.json({ ok: false, error: updateError.message }, { status: 500, headers: cors() });
        }

        // Best-effort contractor notification — never block the webhook ack on this.
        if (proposal.contractor_id) {
          try {
            const { data: contractor } = await supabaseAdmin
              .from("contractors")
              .select("phone")
              .eq("id", proposal.contractor_id)
              .maybeSingle();
            if (contractor?.phone) {
              const amount = proposal.deposit_amount
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(proposal.deposit_amount)
                : "";
              await sendSmsViaGHL({
                to: contractor.phone,
                body: `💰 Deposit received for proposal ${proposal.proposal_number} from ${proposal.client_name}${amount ? ` (${amount})` : ""}. You're clear to schedule the job.`,
              });
            }
          } catch (e) {
            console.warn("[webhook.ghl-invoice-paid] Contractor notify failed (non-critical):", (e as Error).message);
          }
        }

        return Response.json({ ok: true, proposalId: proposal.id }, { headers: cors() });
      },
    },
  },
});
