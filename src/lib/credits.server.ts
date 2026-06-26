import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ActionType =
  | "proposal"
  | "voice_prequal"
  | "document_extraction"
  | "sms_sequence"
  | "verification_report"
  | "renewal_alert";

type Tier = "apprentice" | "journeyman" | "master_gc" | "principal" | "enterprise";

const MONTHLY_ALLOTMENT: Record<string, number> = {
  apprentice:  0,
  journeyman:  0,   // unlimited proposals, no other actions
  master_gc:   500,
  principal:   2000,
  enterprise:  10000,
};

// Actions journeyman can use (unlimited, no credit deduction)
const JOURNEYMAN_ALLOWED: ActionType[] = ["proposal"];

// Lifetime cap for apprentice
const APPRENTICE_LIFETIME_LIMIT = 2;

interface CreditResult {
  allowed: boolean;
  isOverage: boolean;
  message?: string;
}

/**
 * Check whether the contractor can perform the given AI action, then record it.
 * Returns { allowed: true } on any internal error to avoid blocking the payment flow.
 */
export async function checkAndDeductCredit(
  contractorId: string,
  tier: string,
  actionType: ActionType,
  description?: string,
): Promise<CreditResult> {
  try {
    const normalizedTier = (tier || "apprentice") as Tier;
    const billingPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    // ── Apprentice: 2 lifetime actions total ─────────────────────────────────
    if (normalizedTier === "apprentice") {
      const { count } = await supabaseAdmin
        .from("credit_ledger")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", contractorId);

      const used = count ?? 0;
      if (used >= APPRENTICE_LIFETIME_LIMIT) {
        return {
          allowed: false,
          isOverage: false,
          message: "You've used your 2 free AI actions. Upgrade to Journeyman or higher to continue.",
        };
      }

      await supabaseAdmin.from("credit_ledger").insert({
        contractor_id:  contractorId,
        action_type:    actionType,
        credits_used:   1,
        is_overage:     false,
        billing_period: billingPeriod,
        description:    description ?? null,
      });
      return { allowed: true, isOverage: false };
    }

    // ── Journeyman: proposals only, unlimited ─────────────────────────────────
    if (normalizedTier === "journeyman") {
      if (!JOURNEYMAN_ALLOWED.includes(actionType)) {
        return {
          allowed: false,
          isOverage: false,
          message: "This feature requires Master GC or higher. Upgrade your plan to unlock it.",
        };
      }
      // Log without counting against an allotment
      await supabaseAdmin.from("credit_ledger").insert({
        contractor_id:  contractorId,
        action_type:    actionType,
        credits_used:   0,
        is_overage:     false,
        billing_period: billingPeriod,
        description:    description ?? null,
      });
      return { allowed: true, isOverage: false };
    }

    // ── Master GC / Principal / Enterprise: monthly allotment + packs + overage ─
    const allotment = MONTHLY_ALLOTMENT[normalizedTier] ?? 500;

    // Count credits used this period (not overage)
    const { data: usedRows } = await supabaseAdmin
      .from("credit_ledger")
      .select("credits_used")
      .eq("contractor_id", contractorId)
      .eq("billing_period", billingPeriod)
      .eq("is_overage", false);

    const usedThisPeriod = (usedRows ?? []).reduce((s, r) => s + (r.credits_used ?? 0), 0);

    if (usedThisPeriod < allotment) {
      // Within monthly allotment
      await supabaseAdmin.from("credit_ledger").insert({
        contractor_id:  contractorId,
        action_type:    actionType,
        credits_used:   1,
        is_overage:     false,
        billing_period: billingPeriod,
        description:    description ?? null,
      });
      return { allowed: true, isOverage: false };
    }

    // Over allotment — check add-on packs (FIFO)
    const { data: packs } = await supabaseAdmin
      .from("credit_pack_purchases")
      .select("id, credits_remaining")
      .eq("contractor_id", contractorId)
      .gt("credits_remaining", 0)
      .order("purchased_at", { ascending: true })
      .limit(1);

    if (packs && packs.length > 0) {
      const pack = packs[0];
      await Promise.all([
        supabaseAdmin
          .from("credit_pack_purchases")
          .update({ credits_remaining: pack.credits_remaining - 1 })
          .eq("id", pack.id),
        supabaseAdmin.from("credit_ledger").insert({
          contractor_id:  contractorId,
          action_type:    actionType,
          credits_used:   1,
          is_overage:     false,
          billing_period: billingPeriod,
          description:    `${description ?? actionType} (from pack)`,
        }),
      ]);
      return { allowed: true, isOverage: false };
    }

    // No packs — write overage record (billed at $0.50/credit by billing system)
    await supabaseAdmin.from("credit_ledger").insert({
      contractor_id:  contractorId,
      action_type:    actionType,
      credits_used:   1,
      is_overage:     true,
      billing_period: billingPeriod,
      description:    description ?? null,
    });
    return { allowed: true, isOverage: true };
  } catch (err) {
    console.error("[credits] checkAndDeductCredit error:", err);
    // Never block the user's action on a credit-system error
    return { allowed: true, isOverage: false };
  }
}
