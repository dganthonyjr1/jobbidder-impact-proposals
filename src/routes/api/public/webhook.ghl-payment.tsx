import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmailViaGHL } from "@/lib/ghl.server";
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

// Credit add-on pack definitions.
// "proposal" is the pay-as-you-go entry pack for free-tier contractors:
// 3 AI proposals for $75, never expires (see credits.server.ts apprentice path).
const PACK_BY_NAME: Record<string, { pack_name: string; credits: number }> = {
  "proposal": { pack_name: "proposal_3", credits: 3 },
  "starter":  { pack_name: "starter", credits: 1000 },
  "growth":   { pack_name: "growth",  credits: 5000 },
  "scale":    { pack_name: "scale",   credits: 15000 },
};

function productNameFromPayload(p: any): string {
  return String(
    p?.order?.products?.[0]?.name ||
    p?.product_name ||
    p?.productName ||
    p?.product ||
    ""
  ).toLowerCase().trim();
}

function packFromPayload(p: any): { pack_name: string; credits: number } | null {
  const key = productNameFromPayload(p);
  if (!key.includes("credit") && !key.includes("pack")) return null;
  for (const [needle, pack] of Object.entries(PACK_BY_NAME)) {
    if (key.includes(needle)) return pack;
  }
  return null;
}

function tierFromPayload(p: any): string | null {
  const key = productNameFromPayload(p);
  // Don't match subscription tiers inside a credit-pack product name
  if (key.includes("credit") || key.includes("pack")) return null;
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

const TIER_PLAN_LABELS: Record<string, string> = {
  journeyman: "Journeyman",
  master_gc:  "Master GC",
  principal:  "Principal",
  enterprise: "Enterprise",
};

const WHITE_LABEL_TIERS = ["master_gc", "principal", "enterprise"];

async function sendOnboardingEmail(
  email: string,
  contractor: { slug?: string | null; business_name?: string | null },
  tier: string,
) {
  const planLabel = TIER_PLAN_LABELS[tier] ?? tier;
  const businessName = contractor.business_name || "your business";
  const slug = contractor.slug;
  const isWhiteLabel = WHITE_LABEL_TIERS.includes(tier);

  const appUrl = process.env.VITE_APP_URL || "https://jobbidder.io";
  const intakeUrl = isWhiteLabel && slug
    ? `${appUrl}/go/${slug}`
    : `${appUrl}`;

  const creditInfo: Record<string, string> = {
    journeyman: "Unlimited AI proposals are included in your plan. No credit tracking needed.",
    master_gc:  "You have 500 AI credits per month. Each credit powers one AI action (voice pre-qual, SMS sequence, document extraction, verification report).",
    principal:  "You have 2,000 AI credits per month to power all AI actions.",
    enterprise: "You have 10,000 AI credits per month for full-scale AI automation.",
  };

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="font-size:24px;margin-bottom:8px">Welcome to Jobbidder — ${planLabel} Plan 🎉</h1>
      <p>Hi there,</p>
      <p>Your <strong>${planLabel}</strong> subscription is now active for <strong>${businessName}</strong>. Here's how to get started:</p>

      <h2 style="font-size:18px;margin-top:24px">1. Your Client Intake Link</h2>
      <p>Share this link with your clients to instantly generate Good/Better/Best proposals:</p>
      <p><a href="${intakeUrl}" style="color:#10b981;font-weight:bold">${intakeUrl}</a></p>
      ${isWhiteLabel ? `<p style="color:#666;font-size:14px">This is your <strong>white-labeled</strong> intake page — clients see your brand, not Jobbidder.</p>` : ""}

      <h2 style="font-size:18px;margin-top:24px">2. Log Into Your Dashboard</h2>
      <p><a href="${appUrl}/dashboard" style="color:#10b981">Open your Jobbidder dashboard</a> to view proposals, manage your pipeline, and track clients.</p>

      <h2 style="font-size:18px;margin-top:24px">3. Your Credits</h2>
      <p>${creditInfo[tier] || ""}</p>
      <p>Track your usage anytime at <a href="${appUrl}/account" style="color:#10b981">${appUrl}/account</a></p>

      <h2 style="font-size:18px;margin-top:24px">4. Customize Your Branding</h2>
      <p>Add your logo and brand color in <a href="${appUrl}/settings" style="color:#10b981">Settings</a> so every proposal and intake page reflects your brand.</p>

      <hr style="margin:32px 0;border-color:#eee"/>
      <p style="color:#888;font-size:13px">Questions? Reply to this email or reach us anytime. Welcome aboard!</p>
      <p style="color:#888;font-size:13px">— The Jobbidder Team</p>
    </div>
  `;

  await sendEmailViaGHL({
    to: email,
    subject: `Welcome to Jobbidder — Your ${planLabel} plan is active 🎉`,
    html,
    text: `Welcome to Jobbidder! Your ${planLabel} plan for ${businessName} is now active. Visit your dashboard: ${appUrl}/dashboard. Your client intake link: ${intakeUrl}`,
    contactName: businessName,
  });
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

        const lower = email.toLowerCase();

        // ── Credit pack purchase ──────────────────────────────────────────────
        const pack = packFromPayload(body);
        if (pack) {
          const { data: pkContractor } = await supabaseAdmin
            .from("contractors")
            .select("id")
            .or(`email.eq.${lower},billing_email.eq.${lower}`)
            .limit(1)
            .maybeSingle();
          if (!pkContractor) {
            console.log("[ghl-payment] credit pack: no contractor for", lower);
            return Response.json({ ok: true, matched: false, type: "credit_pack" });
          }
          await supabaseAdmin.from("credit_pack_purchases").insert({
            contractor_id:     pkContractor.id,
            pack_name:         pack.pack_name,
            credits_total:     pack.credits,
            credits_remaining: pack.credits,
          });
          console.log("[ghl-payment] credit pack added", { pack: pack.pack_name, credits: pack.credits, contractor: pkContractor.id });
          return Response.json({ ok: true, type: "credit_pack", pack: pack.pack_name, credits: pack.credits });
        }
        // ─────────────────────────────────────────────────────────────────────

        const tier = tierFromPayload(body);
        if (!tier) return new Response("Unrecognized product", { status: 400 });

        // Find contractor by primary email or billing_email
        const { data: existing, error: findErr } = await supabaseAdmin
          .from("contractors")
          .select("id, email, billing_email, slug, business_name, subscription_tier")
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

        const prevTier = existing.subscription_tier ?? "apprentice";
        const isFirstActivation = prevTier === "apprentice" || !prevTier;

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

        // ── Onboarding email on first paid activation ─────────────────────────
        if (isFirstActivation) {
          sendOnboardingEmail(lower, existing, tier).catch((err) =>
            console.error("[ghl-payment] onboarding email failed:", err),
          );
        }
        // ─────────────────────────────────────────────────────────────────────

        return Response.json({ ok: true, contractor_id: existing.id, tier });
      },
    },
  },
});