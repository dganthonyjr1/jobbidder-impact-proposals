import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { upgradeEstimateToProposal } from "@/lib/estimates.server";

export const listEstimates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Scope strictly to the signed-in contractor via the admin client, rather
    // than relying on RLS/token forwarding, so estimates can't leak across
    // accounts.
    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contractor) return [];

    const { data, error } = await supabaseAdmin
      .from("estimates")
      .select("id, estimate_number, client_name, status, created_at, job_state, trade_type, total_low, total_high, upgraded_to_proposal_id")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upgradeEstimate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ estimateId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    return upgradeEstimateToProposal(data.estimateId);
  });

export const getEstimateContractor = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ estimateId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: est } = await supabaseAdmin
      .from("estimates").select("contractor_id").eq("id", data.estimateId).maybeSingle();
    return { contractor_id: est?.contractor_id ?? null };
  });