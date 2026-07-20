import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeTotals, type LaborLine, type MaterialLine } from "@/lib/pricing";
import { cancelProposalFollowups } from "@/lib/followups.server";
import { notifyContractorOfDecision } from "@/lib/notify-contractor.server";
import { updateHubspotDealStage, HUBSPOT_STAGE } from "@/lib/hubspot.server";
import { noteNetsuiteOpportunity } from "@/lib/netsuite.server";

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  signatureName: z.string().trim().min(1).max(200),
  signatureEmail: z.string().trim().email().max(254).optional().nullable(),
  acceptedTier: z.enum(["good", "better", "best"]),
  signatureDataUrl: z.string().trim().startsWith("data:image/").max(2_000_000).optional().nullable(),
});

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export const Route = createFileRoute("/api/public/accept-proposal")({
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
            { success: false, error: "Invalid signature request", details: (e as Error).message },
            { status: 400 },
          );
        }

        const { data: proposal, error: proposalError } = await supabaseAdmin
          .from("proposals")
          .select("id, status, materials, labor, tax_rate, overhead_percentage, contractor_id, hubspot_deal_id, netsuite_deal_id")
          .eq("id", input.proposalId)
          .maybeSingle();

        if (proposalError || !proposal) {
          return Response.json({ success: false, error: "Proposal not found" }, { status: 404 });
        }

        const materials = (proposal.materials || []) as MaterialLine[];
        const labor = (proposal.labor || []) as LaborLine[];
        const totals = computeTotals(materials, labor, input.acceptedTier, Number(proposal.tax_rate) || 0.07, Number(proposal.overhead_percentage) || 0);

        const { error: acceptanceError } = await supabaseAdmin.from("proposal_acceptances").insert({
          proposal_id: input.proposalId,
          signature_name: input.signatureName,
          signature_email: input.signatureEmail || null,
          signature_image: input.signatureDataUrl || null,
          accepted_tier: input.acceptedTier,
          total_amount: totals.grandTotal,
          ip_address: getClientIp(request),
        });

        if (acceptanceError) {
          return Response.json({ success: false, error: acceptanceError.message }, { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from("proposals")
          .update({ status: "accepted", selected_tier: input.acceptedTier })
          .eq("id", input.proposalId);

        if (updateError) {
          return Response.json({ success: false, error: updateError.message }, { status: 500 });
        }

        // Cancel any pending follow-ups since the client has signed
        try { await cancelProposalFollowups(input.proposalId); } catch (e) { console.warn("cancel followups failed:", (e as Error).message); }

        // Notify contractor via email + SMS
        try {
          await notifyContractorOfDecision({
            proposalId: input.proposalId,
            decision: "accepted",
            totalAmount: totals.grandTotal,
            signerName: input.signatureName,
          });
        } catch (e) {
          console.warn("notify accept failed:", (e as Error).message);
        }

        if (proposal.hubspot_deal_id && proposal.contractor_id) {
          try {
            const { data: integration } = await supabaseAdmin
              .from("contractor_integrations")
              .select("hubspot_private_app_token, hubspot_sync_enabled")
              .eq("contractor_id", proposal.contractor_id)
              .maybeSingle();
            await updateHubspotDealStage({
              dealId: proposal.hubspot_deal_id,
              stage: HUBSPOT_STAGE.accepted,
              amount: totals.grandTotal,
              credentials: integration
                ? { privateAppToken: integration.hubspot_private_app_token, syncEnabled: integration.hubspot_sync_enabled }
                : null,
            });
          } catch (e) {
            console.warn("hubspot deal update (accept) failed:", (e as Error).message);
          }
        }

        if (proposal.netsuite_deal_id && proposal.contractor_id) {
          try {
            const { data: integration } = await supabaseAdmin
              .from("contractor_integrations")
              .select("netsuite_account_id, netsuite_consumer_key, netsuite_consumer_secret, netsuite_token_id, netsuite_token_secret, netsuite_sync_enabled")
              .eq("contractor_id", proposal.contractor_id)
              .maybeSingle();
            await noteNetsuiteOpportunity({
              opportunityId: proposal.netsuite_deal_id,
              memo: `Proposal accepted — total $${totals.grandTotal.toFixed(2)}`,
              credentials: integration
                ? {
                    accountId: integration.netsuite_account_id,
                    consumerKey: integration.netsuite_consumer_key,
                    consumerSecret: integration.netsuite_consumer_secret,
                    tokenId: integration.netsuite_token_id,
                    tokenSecret: integration.netsuite_token_secret,
                    syncEnabled: integration.netsuite_sync_enabled,
                  }
                : null,
            });
          } catch (e) {
            console.warn("netsuite opportunity update (accept) failed:", (e as Error).message);
          }
        }

        return Response.json({ success: true, status: "accepted", totalAmount: totals.grandTotal });
      },
    },
  },
});