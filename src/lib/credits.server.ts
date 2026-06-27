import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

export const getCreditUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const billingPeriod = new Date().toISOString().slice(0, 7);

    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id, subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (!contractor) return null;

    const tier = (contractor.subscription_tier ?? "apprentice") as string;
    const allotment = MONTHLY_ALLOTMENT[tier] ?? 0;

    // Credits used this billing period (non-overage)
    const { data: ledgerRows } = await supabaseAdmin
      .from("credit_ledger")
      .select("credits_used, is_overage, action_type")
      .eq("contractor_id", contractor.id)
      .eq("billing_period", billingPeriod);

    const rows = ledgerRows ?? [];
    const usedThisPeriod = rows
      .filter((r) => !r.is_overage)
      .reduce((s, r) => s + (r.credits_used ?? 0), 0);
    const overageCount = rows.filter((r) => r.is_overage).length;

    // Lifetime count (apprentice)
    const lifetimeCount = tier === "apprentice"
      ? (await supabaseAdmin
          .from("credit_ledger")
          .select("id", { count: "exact", head: true })
          .eq("contractor_id", contractor.id)
        ).count ?? 0
      : null;

    // Add-on pack credits remaining
    const { data: packs } = await supabaseAdmin
      .from("credit_pack_purchases")
      .select("pack_name, credits_total, credits_remaining, purchased_at")
      .eq("contractor_id", contractor.id)
      .gt("credits_remaining", 0)
      .order("purchased_at", { ascending: true });

    const packCreditsRemaining = (packs ?? []).reduce((s, p) => s + p.credits_remaining, 0);

    return {
      tier,
      billingPeriod,
      allotment,
      usedThisPeriod,
      overageCount,
      lifetimeCount,
      packCreditsRemaining,
      packs: packs ?? [],
    };
  });

export const getCreditHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: contractor } = await supabaseAdmin
      .from("contractors")
      .select("id, subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (!contractor) return { ledger: [], packs: [] };

    const [{ data: ledger }, { data: packs }] = await Promise.all([
      supabaseAdmin
        .from("credit_ledger")
        .select("id, action_type, credits_used, is_overage, billing_period, description, created_at")
        .eq("contractor_id", contractor.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("credit_pack_purchases")
        .select("id, pack_name, credits_total, credits_remaining, purchased_at")
        .eq("contractor_id", contractor.id)
        .order("purchased_at", { ascending: false })
        .limit(20),
    ]);

    return {
      ledger: ledger ?? [],
      packs: packs ?? [],
    };
  });
