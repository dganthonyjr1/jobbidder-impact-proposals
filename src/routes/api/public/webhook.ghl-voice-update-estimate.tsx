/**
 * POST /api/public/webhook/ghl-voice-update-estimate
 *
 * GHL Voice AI fires this when a contractor calls back to UPDATE an existing
 * proposal instead of creating a new one. We locate the existing proposal,
 * fold the requested changes into its scope, regenerate it with the same
 * pricing model, and re-send it — keeping the SAME proposal number and link.
 *
 * No new proposal credit is charged: this edits an existing proposal.
 *
 * GHL webhook fields (send what the caller provides; proposal_number preferred):
 *   contractor_slug  — which contractor's proposals/pricing to use (required)
 *   proposal_number  — the number from the original email/SMS (best match key)
 *   customer_name    — fallback: who the original proposal is for
 *   job_address      — fallback: the project address on the proposal
 *   phone            — fallback: caller's phone (matched against the proposal)
 *   changes          — what the caller wants added or changed (required)
 *   language         — en|es|fr|pt|ht (optional; defaults to the proposal's language)
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mergePricing, callGroqAI } from "@/lib/proposal-ai.server";
import { toE164US } from "@/lib/twilio.server";

/** Normalize a spoken/typed proposal number: uppercase, collapse whitespace. */
function normalizeProposalNumber(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").trim();
}

/** Pull the trailing 6-digit sequence out of a proposal number for fuzzy matching. */
function proposalNumberDigits(raw: string): string | null {
  const m = raw.replace(/\D/g, "");
  // proposal numbers look like SIA-YYMMDD-NNNNNN → last 6 digits are the random tail
  return m.length >= 6 ? m.slice(-6) : null;
}

export const Route = createFileRoute("/api/public/webhook/ghl-voice-update-estimate")({
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
        let body: Record<string, any>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const slug: string = (body.contractor_slug ?? body.slug ?? "").trim();
        const proposalNumberRaw: string = (body.proposal_number ?? body.proposalNumber ?? "").trim();
        const customerName: string = (body.customer_name ?? body.client_name ?? body.contact?.name ?? "").trim();
        const jobAddress: string = (body.job_address ?? body.address ?? "").trim();
        const callerPhone: string = (body.phone ?? body.contact?.phone ?? body.client_phone ?? "").trim();
        const changes: string = (body.changes ?? body.update ?? body.job_description ?? body.notes ?? "").trim();
        const langOverride: string = (body.language ?? body.contact?.language ?? body.lang ?? "").toLowerCase().slice(0, 2);

        // Validate
        const missing: string[] = [];
        if (!slug) missing.push("contractor_slug");
        if (!changes || changes.length < 3) missing.push("changes");
        if (!proposalNumberRaw && !customerName && !jobAddress && !callerPhone) {
          missing.push("one of: proposal_number, customer_name, job_address, phone");
        }
        if (missing.length) {
          return Response.json({ error: "Missing required fields", missing }, { status: 400 });
        }

        // Resolve contractor
        const { data: contractor, error: contractorError } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, email, pricing_settings")
          .eq("slug", slug)
          .maybeSingle();
        if (contractorError) console.error("[webhook.ghl-voice-update-estimate] Contractor lookup failed:", contractorError.message);
        if (!contractor) {
          return Response.json({ error: "Contractor not found" }, { status: 404 });
        }

        // ---- Locate the proposal to update -------------------------------
        // Strategy (most reliable first): proposal number → customer/address → caller phone.
        // Always scoped to this contractor, always the most recent match.
        let proposal: any = null;

        if (proposalNumberRaw) {
          const normalized = normalizeProposalNumber(proposalNumberRaw);
          // Exact normalized match
          const exact = await supabaseAdmin
            .from("proposals")
            .select("*")
            .eq("contractor_id", contractor.id)
            .ilike("proposal_number", normalized)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          proposal = exact.data;

          // Fuzzy: match on the trailing 6-digit tail if exact failed
          if (!proposal) {
            const tail = proposalNumberDigits(normalized);
            if (tail) {
              const fuzzy = await supabaseAdmin
                .from("proposals")
                .select("*")
                .eq("contractor_id", contractor.id)
                .ilike("proposal_number", `%${tail}`)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              proposal = fuzzy.data;
            }
          }
        }

        if (!proposal && (customerName || jobAddress)) {
          let q = supabaseAdmin
            .from("proposals")
            .select("*")
            .eq("contractor_id", contractor.id);
          if (customerName) q = q.ilike("client_name", `%${customerName}%`);
          if (jobAddress) q = q.ilike("job_address", `%${jobAddress}%`);
          const byNameAddr = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
          proposal = byNameAddr.data;
        }

        if (!proposal && callerPhone) {
          const e164 = toE164US(callerPhone);
          const byPhone = await supabaseAdmin
            .from("proposals")
            .select("*")
            .eq("contractor_id", contractor.id)
            .eq("client_phone", e164)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          proposal = byPhone.data;
        }

        if (!proposal) {
          return Response.json(
            { error: "No matching proposal found to update", searched: { proposalNumberRaw, customerName, jobAddress, callerPhone } },
            { status: 404 },
          );
        }

        // ---- Regenerate with the requested changes -----------------------
        const language = langOverride || proposal.language || "en";
        const combinedDescription =
          `${proposal.job_description}\n\n--- UPDATE REQUESTED (${new Date().toISOString().slice(0, 10)}) ---\n${changes}`;

        const pricing = mergePricing(contractor.pricing_settings as any);
        const ai = await callGroqAI(
          {
            client_name: proposal.client_name,
            job_address: proposal.job_address,
            trade_type: proposal.trade_type,
            job_description: combinedDescription,
            language,
          },
          contractor.business_name,
          pricing,
        );

        // Apply the regenerated content to the SAME proposal row.
        const update: Record<string, any> = {
          job_description: combinedDescription,
          language,
          updated_at: new Date().toISOString(),
        };
        if (ai) {
          update.scope_of_work = ai.scope_of_work || proposal.scope_of_work;
          update.timeline = ai.timeline ?? proposal.timeline;
          update.warranty = ai.warranty || proposal.warranty;
          update.exclusions = ai.exclusions || proposal.exclusions;
          update.materials = ai.materials || proposal.materials;
          update.labor = ai.labor || proposal.labor;
          update.tiers = ai.tiers || proposal.tiers;
          update.tax_rate = (ai.tax_rate ?? (Number(proposal.tax_rate) * 100)) / 100;
          update.payment_terms = ai.payment_terms || proposal.payment_terms;
        }

        const { error: updErr } = await supabaseAdmin
          .from("proposals")
          .update(update as any)
          .eq("id", proposal.id);
        if (updErr) {
          return Response.json({ error: updErr.message }, { status: 500 });
        }

        // ---- Re-send (email + SMS both handled by send-proposal-email) ----
        const origin = new URL(request.url).origin;
        let resendOk = false;
        if (proposal.client_email) {
          try {
            const r = await fetch(`${origin}/api/public/send-proposal-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ proposalId: proposal.id, recipientEmail: proposal.client_email }),
            });
            resendOk = r.ok;
          } catch (e) {
            console.warn("[voice-update] resend failed:", (e as Error).message);
          }
        }

        return Response.json({
          success: true,
          updated: true,
          ai_regenerated: !!ai,
          proposal_id: proposal.id,
          proposal_number: proposal.proposal_number,
          proposal_url: `${origin}/p/${proposal.id}`,
          resent: resendOk,
          language,
        });
      },
    },
  },
});
