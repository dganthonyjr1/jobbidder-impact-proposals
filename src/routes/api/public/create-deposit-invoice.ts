import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import process from "node:process";

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  acceptedTier: z.enum(["good", "better", "best"]),
  totalAmount: z.number().positive(),
  signerName: z.string().trim().min(1).max(200),
  signerEmail: z.string().trim().email().max(254).optional().nullable(),
  signerPhone: z.string().optional().nullable(),
});

function ghlHeaders(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Version": "2023-02-21",
  };
}

export const Route = createFileRoute("/api/public/create-deposit-invoice")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        let input: z.infer<typeof BodySchema>;
        try {
          input = BodySchema.parse(await request.json());
        } catch (e) {
          return Response.json(
            { success: false, error: "Invalid request", details: (e as Error).message },
            { status: 400 },
          );
        }

        // Fetch proposal + contractor details
        const { data: proposal, error: proposalError } = await supabaseAdmin
          .from("proposals")
          .select("id, proposal_number, job_address, client_name, client_phone, client_email, contractor_id")
          .eq("id", input.proposalId)
          .maybeSingle();

        if (proposalError || !proposal) {
          return Response.json({ success: false, error: "Proposal not found" }, { status: 404 });
        }

        const { data: contractor } = proposal.contractor_id
          ? await supabaseAdmin
              .from("contractors")
              .select("business_name, email, phone, ghl_api_token, ghl_location_id")
              .eq("id", proposal.contractor_id)
              .maybeSingle()
          : { data: null };

        // Resolve GHL credentials — prefer platform env vars
        const ghlToken = process.env.GHL_API_TOKEN || contractor?.ghl_api_token;
        const locationId = process.env.GHL_LOCATION_ID || contractor?.ghl_location_id;

        if (!ghlToken || !locationId) {
          return Response.json(
            { success: false, error: "GHL not configured — cannot create invoice" },
            { status: 503 },
          );
        }

        // Calculate deposit amount (50% of accepted tier total)
        const depositAmount = Math.round((input.totalAmount * 0.5) * 100) / 100;
        const depositAmountCents = Math.round(depositAmount * 100);

        const businessName = contractor?.business_name || "Sudden Impact Agency";
        const today = new Date().toISOString().split("T")[0];
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const tierLabel = input.acceptedTier.charAt(0).toUpperCase() + input.acceptedTier.slice(1);

        // First, upsert the contact in GHL to get a contactId
        const contactPayload: Record<string, any> = {
          firstName: input.signerName.split(" ")[0] || input.signerName,
          lastName: input.signerName.split(" ").slice(1).join(" ") || "",
          locationId,
        };
        if (input.signerEmail) contactPayload.email = input.signerEmail;
        if (input.signerPhone || proposal.client_phone) {
          contactPayload.phone = input.signerPhone || proposal.client_phone;
        }

        let contactId: string | null = null;
        try {
          const contactRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
            method: "POST",
            headers: ghlHeaders(ghlToken),
            body: JSON.stringify(contactPayload),
          });
          const contactJson: any = await contactRes.json().catch(() => ({}));
          contactId = contactJson?.contact?.id || contactJson?.id || null;
        } catch (e) {
          console.warn("[create-deposit-invoice] contact upsert failed:", (e as Error).message);
        }

        // Build the GHL invoice payload
        const invoicePayload: Record<string, any> = {
          altId: locationId,
          altType: "location",
          name: `Deposit — ${proposal.proposal_number} (${tierLabel})`,
          title: "DEPOSIT INVOICE",
          currency: "USD",
          liveMode: true,
          issueDate: today,
          dueDate,
          businessDetails: {
            name: businessName,
          },
          items: [
            {
              name: `50% Deposit — ${tierLabel} Package`,
              description: `Project: ${proposal.job_address || "See proposal"} | Proposal: ${proposal.proposal_number}`,
              currency: "USD",
              amount: depositAmountCents, // GHL invoices API uses cents
              qty: 1,
              type: "one_time",
            },
          ],
          discount: { value: 0, type: "percentage" },
          termsNotes: `<p>This deposit secures your project start date. Remaining balance due upon project completion. Proposal: <strong>${proposal.proposal_number}</strong>.</p>`,
          paymentMethods: {
            stripe: { enableBankDebitOnly: false },
          },
        };

        // Add contact details if we have them
        if (contactId || input.signerEmail) {
          invoicePayload.contactDetails = {
            ...(contactId ? { id: contactId } : {}),
            name: input.signerName,
            ...(input.signerEmail ? { email: input.signerEmail } : {}),
            ...(input.signerPhone || proposal.client_phone
              ? { phoneNo: input.signerPhone || proposal.client_phone }
              : {}),
          };
          invoicePayload.sentTo = {
            ...(input.signerEmail ? { email: [input.signerEmail] } : {}),
            ...(input.signerPhone || proposal.client_phone
              ? { phoneNo: [input.signerPhone || proposal.client_phone] }
              : {}),
          };
        }

        // Create the invoice in GHL
        const invoiceRes = await fetch("https://services.leadconnectorhq.com/invoices/", {
          method: "POST",
          headers: ghlHeaders(ghlToken),
          body: JSON.stringify(invoicePayload),
        });

        const invoiceJson: any = await invoiceRes.json().catch(() => ({}));

        if (!invoiceRes.ok) {
          console.error("[create-deposit-invoice] GHL invoice creation failed:", invoiceJson);
          return Response.json(
            {
              success: false,
              error: invoiceJson?.message || `GHL invoice creation failed (${invoiceRes.status})`,
              details: invoiceJson,
            },
            { status: 502 },
          );
        }

        const invoiceId: string = invoiceJson?._id || invoiceJson?.id;
        if (!invoiceId) {
          return Response.json(
            { success: false, error: "GHL returned no invoice ID" },
            { status: 502 },
          );
        }

        // Send the invoice to the lead via GHL (triggers payment email)
        let paymentUrl: string | null = null;
        try {
          const sendRes = await fetch(`https://services.leadconnectorhq.com/invoices/${invoiceId}/send`, {
            method: "POST",
            headers: ghlHeaders(ghlToken),
            body: JSON.stringify({
              action: "send_now",
              ...(input.signerEmail ? { sentTo: { email: [input.signerEmail] } } : {}),
            }),
          });
          const sendJson: any = await sendRes.json().catch(() => ({}));
          paymentUrl = sendJson?.paymentLink || sendJson?.invoiceUrl || sendJson?.url || null;
        } catch (e) {
          console.warn("[create-deposit-invoice] send invoice failed:", (e as Error).message);
        }

        // If GHL didn't return a payment URL directly, construct the standard GHL invoice URL
        if (!paymentUrl) {
          paymentUrl = `https://invoice.leadconnectorhq.com/invoice/${invoiceId}`;
        }

        // Store the invoice reference on the proposal
        try {
          await supabaseAdmin
            .from("proposals")
            .update({
              deposit_invoice_id: invoiceId,
              deposit_amount: depositAmount,
              deposit_status: "pending",
            })
            .eq("id", input.proposalId);
        } catch (e) {
          console.warn("[create-deposit-invoice] failed to update proposal with invoice id:", (e as Error).message);
        }

        return Response.json({
          success: true,
          invoiceId,
          depositAmount,
          paymentUrl,
          proposalNumber: proposal.proposal_number,
        });
      },
    },
  },
});
