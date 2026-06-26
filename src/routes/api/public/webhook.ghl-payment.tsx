import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import process from "node:process";

/**
 * GHL payment webhook. Configure in GHL Workflow as "Webhook" action
 * triggered by Order Form Submitted / Invoice Paid for each tier product.
 *
 * Security: requires ?token=<GHL_WEBHOOK_TOKEN> query param matching the
 * server secret. Set this same token on the webhook URL in GHL.
 *
 * Expected payload (GHL standard order webhook):
 *  {
 *    contact: { email, phone, first_name, last_name },
 *    order: { amount, currency, products: [{ name, price }] }
 *  }
 * We also accept flat fields (email, amount, product_name) for flexibility.
 */

const TIER_BY_NAME: Record<string, string> = {
  apprentice:  "apprentice",
  journeyman:  "journeyman",
  "master gc": "master_gc",
  "master_gc": "master_gc",
  principal:   "principal",
  enterprise:  "enterprise",
};

// Monthly plan value in cents per tier (matches current pricing)
const TIER_CENTS: Record<string, number> = {
  apprentice:  0,
  journeyman:  49700,
  master_gc:   99700,
  principal:   199700,
  enterprise:  350000,
};

function tierFromPayload(p: any): string | null {
  const productName: string =
    p?.order?.products?.[0]?.name ||
    p?.product_name ||
    p?.productName ||
    p?.product ||
    "";
  const key = String(productName).toLowerCase().trim();
  for (const [needle, tier] of Object.entries(TIER_BY_NAME)) {
    if (key.includes(needle)) return tier;
  }
  // Fallback: classify by amount (USD)
  const amount = Number(p?.order?.amount ?? p?.amount ?? p?.total ?? 0);
  if (amount >= 6000) return "principal";
  if (amount >= 450) return "master_gc";
  if (amount >= 250) return "journeyman";
  return null;
}

async function processAffiliateCommission(payerEmail: string, tier: string) {
  try {
    // Find a pending/active referral for this email
    const { data: referral } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_code, referred_company, status, activated_at")
      .eq("referred_email", payerEmail)
      .neq("status", "churned")
      .maybeSingle();

    if (!referral) return;

    const billingPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
    const planCents     = TIER_CENTS[tier] ?? 49700;
    const commission    = Math.round(planCents * 0.15);

    if (commission === 0) return; // apprentice is free, no commission

    // Idempotency: don't write duplicate commission for same referral + period
    const { data: dupe } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("id")
      .eq("referral_id", referral.id)
      .eq("billing_period", billingPeriod)
      .eq("transaction_type", "commission_earned")
      .maybeSingle();

    if (dupe) return;

    const now = new Date().toISOString();
    await Promise.all([
      supabaseAdmin.from("affiliate_transactions").insert({
        referrer_code:    referral.referrer_code,
        referral_id:      referral.id,
        transaction_type: "commission_earned",
        amount_cents:     commission,
        description:      `15% commission — ${referral.referred_company} (${tier})`,
        billing_period:   billingPeriod,
        status:           "pending",
      }),
      supabaseAdmin.from("referrals").update({
        status:       "active",
        activated_at: referral.activated_at ?? now,
        plan_name:    tier,
        plan_amount_cents: planCents,
      }).eq("id", referral.id),
    ]);

    console.log("[affiliate] commission written", { referral: referral.id, commission, billingPeriod });
  } catch (err) {
    // Never let affiliate errors break the payment flow
    console.error("[affiliate] processAffiliateCommission failed:", err);
  }
}

export const Route = createFileRoute("/api/public/webhook/ghl-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const expected = process.env.GHL_WEBHOOK_TOKEN;
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body: any = await request.json().catch(() => ({}));
        const email: string | undefined =
          body?.contact?.email || body?.email || body?.customer?.email;
        if (!email) return new Response("Missing email", { status: 400 });

        const tier = tierFromPayload(body);
        if (!tier) return new Response("Unrecognized product", { status: 400 });

        const lower = email.toLowerCase();
        // Find contractor by primary email or billing_email
        const { data: existing, error: findErr } = await supabaseAdmin
          .from("contractors")
          .select("id, email, billing_email")
          .or(`email.eq.${lower},billing_email.eq.${lower}`)
          .limit(1)
          .maybeSingle();
        if (findErr) return new Response(findErr.message, { status: 500 });
        if (!existing) {
          // Stash for later — when the user signs up with this email we can
          // attach the plan. For now just 200 so GHL doesn't retry forever.
          console.log("[ghl-payment] no contractor for", lower, "tier=", tier);
          return Response.json({ ok: true, matched: false });
        }

        const { error: upErr } = await supabaseAdmin
          .from("contractors")
          .update({
            subscription_tier: tier,
            subscription_status: "active",
            billing_email: lower,
            last_payment_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (upErr) return new Response(upErr.message, { status: 500 });

        // ── Affiliate commission ──────────────────────────────────────────────
        await processAffiliateCommission(lower, tier);
        // ─────────────────────────────────────────────────────────────────────

        return Response.json({ ok: true, contractor_id: existing.id, tier });
      },
    },
  },
});