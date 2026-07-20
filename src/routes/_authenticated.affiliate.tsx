import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, DollarSign, Users, TrendingUp, Wallet,
  Link2, ExternalLink, Plus, Trash2, Eye, BadgeCheck,
  Clock, AlertCircle, Download, Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReferralCode {
  id: string;
  user_id: string;
  company_name: string;
  code: string;
  payout_preference: "credit" | "payout";
  payout_email: string | null;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_code: string;
  referred_company: string;
  referred_email: string | null;
  plan_name: string;
  plan_amount_cents: number;
  commission_rate: number;
  status: "pending" | "active" | "churned";
  activated_at: string | null;
  created_at: string;
}

interface AffiliateTx {
  id: string;
  referrer_code: string;
  referral_id: string | null;
  transaction_type: string;
  amount_cents: number;
  description: string | null;
  billing_period: string | null;
  status: "pending" | "processed" | "failed";
  created_at: string;
}

interface AuditLink {
  id: string;
  user_id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface AffiliateData {
  code: ReferralCode | null;
  referrals: Referral[];
  transactions: AffiliateTx[];
  auditLinks: AuditLink[];
}

// ─── Server Functions ───────────────────────────────────────────────────────────

const getAffiliateData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
  }).parse(input))
  .handler(async ({ data: { userId, email } }): Promise<AffiliateData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: code } = await supabaseAdmin
      .from("referral_codes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!code) {
      const shortId = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
      const newCode = `JB-${shortId}`;
      const companyName = email.split("@")[1]?.split(".")[0] ?? "Partner";
      const { data: created, error: createdError } = await supabaseAdmin
        .from("referral_codes")
        .insert({ user_id: userId, company_name: companyName, code: newCode })
        .select()
        .single();
      if (createdError) console.error("[affiliate] Referral code creation failed:", createdError.message);
      code = created;
    }

    if (!code) return { code: null, referrals: [], transactions: [], auditLinks: [] };

    const [refRes, txRes, linkRes] = await Promise.all([
      supabaseAdmin.from("referrals").select("*").eq("referrer_code", code.code).order("created_at", { ascending: false }),
      supabaseAdmin.from("affiliate_transactions").select("*").eq("referrer_code", code.code).order("created_at", { ascending: false }),
      supabaseAdmin.from("audit_access_links").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    return {
      code,
      referrals: refRes.data ?? [],
      transactions: txRes.data ?? [],
      auditLinks: linkRes.data ?? [],
    };
  });

const updatePayoutPreference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    userId: z.string().uuid(),
    preference: z.enum(["credit", "payout"]),
    payoutEmail: z.string().email().optional().nullable(),
  }).parse(input))
  .handler(async ({ data: { userId, preference, payoutEmail } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("referral_codes")
      .update({ payout_preference: preference, payout_email: payoutEmail ?? null })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createAuditLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    userId: z.string().uuid(),
    label: z.string().min(1),
    expiresAt: z.string().nullable(),
  }).parse(input))
  .handler(async ({ data: { userId, label, expiresAt } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("hex");
    const { data, error } = await supabaseAdmin
      .from("audit_access_links")
      .insert({ user_id: userId, token, label, expires_at: expiresAt || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as AuditLink;
  });

const revokeAuditLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ linkId: z.string().uuid() }).parse(input))
  .handler(async ({ data: { linkId } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("audit_access_links")
      .update({ is_active: false })
      .eq("id", linkId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [{ title: "Affiliate Program — Jobbidder" }],
  }),
  component: AffiliatePage,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cents(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TX_LABELS: Record<string, { label: string; color: string }> = {
  commission_earned:  { label: "Commission Earned",  color: "text-success bg-success/10" },
  credit_applied:     { label: "Credit Applied",     color: "text-blue-400 bg-blue-500/10" },
  payout_issued:      { label: "Payout Issued",      color: "text-purple-400 bg-purple-500/10" },
  adjustment:         { label: "Adjustment",         color: "text-orange-400 bg-orange-500/10" },
  pack_purchase:      { label: "Pack Purchase",      color: "text-slate-300 bg-slate-400/10" },
  overage_charge:     { label: "Overage Charge",     color: "text-red-400 bg-red-500/10" },
};

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function AffiliatePage() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [payoutPref, setPayoutPref]     = useState<"credit" | "payout">("credit");
  const [payoutEmail, setPayoutEmail]   = useState("");
  const [showNewLink, setShowNewLink]   = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkExpiry, setNewLinkExpiry] = useState("");
  const qc = useQueryClient();

  const getAffiliateFn       = useServerFn(getAffiliateData);
  const updatePayoutFn       = useServerFn(updatePayoutPreference);
  const createAuditLinkFn    = useServerFn(createAuditLink);
  const revokeAuditLinkFn    = useServerFn(revokeAuditLink);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate", userId],
    queryFn: () => getAffiliateFn({ data: { userId: userId!, email: userEmail! } }),
    enabled: !!userId && !!userEmail,
  });

  useEffect(() => {
    if (data?.code) {
      setPayoutPref(data.code.payout_preference);
      setPayoutEmail(data.code.payout_email ?? "");
    }
  }, [data?.code]);

  const updatePayoutMutation = useMutation({
    mutationFn: () => updatePayoutFn({ data: { userId: userId!, preference: payoutPref, payoutEmail: payoutPref === "payout" ? payoutEmail : null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate", userId] }),
  });

  const createLinkMutation = useMutation({
    mutationFn: () => createAuditLinkFn({ data: { userId: userId!, label: newLinkLabel, expiresAt: newLinkExpiry || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate", userId] });
      setShowNewLink(false);
      setNewLinkLabel("");
      setNewLinkExpiry("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (linkId: string) => revokeAuditLinkFn({ data: { linkId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate", userId] }),
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function downloadCSV() {
    const rows = [
      ["Date", "Type", "Description", "Period", "Amount", "Status"],
      ...(data?.transactions ?? []).map(t => [
        fmtDate(t.created_at),
        TX_LABELS[t.transaction_type]?.label ?? t.transaction_type,
        t.description ?? "",
        t.billing_period ?? "",
        cents(t.amount_cents),
        t.status,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "jobbidder-affiliate-transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const code         = data?.code;
  const referrals    = data?.referrals ?? [];
  const transactions = data?.transactions ?? [];
  const auditLinks   = data?.auditLinks ?? [];

  const origin       = typeof window !== "undefined" ? window.location.origin : "https://www.jobbidder.io";
  const referralLink = code ? `${origin}?ref=${code.code}` : "";

  const activeCount = referrals.filter(r => r.status === "active").length;
  const mtdEarned   = transactions.filter(t => t.transaction_type === "commission_earned" && t.billing_period === currentPeriod()).reduce((s, t) => s + t.amount_cents, 0);
  const totalEarned = transactions.filter(t => t.transaction_type === "commission_earned").reduce((s, t) => s + t.amount_cents, 0);
  const totalOut    = transactions.filter(t => ["payout_issued", "credit_applied"].includes(t.transaction_type)).reduce((s, t) => s + t.amount_cents, 0);
  const pending     = totalEarned - totalOut;

  if (isLoading || !userId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <p className="text-muted-foreground text-sm">Loading affiliate data…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            <Share2 className="h-3 w-3" />
            Affiliate Program — 15% Recurring Commission
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Your Affiliate Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-lg">
            Earn 15% of every referred company's monthly plan — for as long as they stay a customer.
            Take it as a bill credit or cash payout. Every dollar is tracked in your ledger below.
          </p>
        </div>
        {code && (
          <div className="rounded-xl border border-border bg-card/60 px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Your Code</p>
            <p className="font-display text-2xl font-bold text-primary tracking-widest">{code.code}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Referrals"  value={String(activeCount)} sub="paying customers"      icon={Users} />
        <StatCard label="This Month"        value={cents(mtdEarned)}    sub="commissions earned"    icon={TrendingUp} />
        <StatCard label="Total Earned"      value={cents(totalEarned)}  sub="lifetime commissions"  icon={DollarSign} />
        <StatCard label="Pending Balance"   value={cents(pending)}      sub={payoutPref === "credit" ? "as bill credit" : "for cash payout"} icon={Wallet} />
      </div>

      {/* Referral Link + Payout Settings */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Referral Link */}
        <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Your Referral Link</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this link. When a company signs up and pays, you earn 15% of their monthly plan
            every month they remain active — automatically.
          </p>
          {referralLink && (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-muted-foreground truncate">
                {referralLink}
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(referralLink, "link")} className="shrink-0">
                {copiedKey === "link" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
            {[
              { plan: "Journeyman", monthly: "$497", commission: "+$74.55/mo" },
              { plan: "Master GC",  monthly: "$997", commission: "+$149.55/mo" },
              { plan: "Principal",  monthly: "$1,997", commission: "+$299.55/mo" },
            ].map(r => (
              <div key={r.plan} className="rounded-lg border border-border bg-background/60 p-2">
                <p className="font-semibold">{r.plan}</p>
                <p className="text-muted-foreground">{r.monthly}/mo</p>
                <p className="text-primary font-bold">{r.commission}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Enterprise referrals earn <strong className="text-foreground">$525/mo</strong> (15% of $3,500) — the single most valuable referral in the program.
          </p>
        </div>

        {/* Payout Settings */}
        <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-bold">How You Get Paid</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose how commissions are applied. You can change this at any time.
          </p>
          <div className="space-y-2">
            {([
              { value: "credit" as const, label: "Apply as bill credit", desc: "Automatically deducted from your next monthly invoice — zero friction" },
              { value: "payout" as const, label: "Cash payout (ACH/wire)", desc: "Transferred to your bank at the end of each billing cycle" },
            ] as const).map(opt => (
              <label
                key={opt.value}
                className={
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition " +
                  (payoutPref === opt.value ? "border-primary/60 bg-primary/5" : "border-border hover:bg-accent/30")
                }
              >
                <input
                  type="radio"
                  name="payout"
                  value={opt.value}
                  checked={payoutPref === opt.value}
                  onChange={() => setPayoutPref(opt.value)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {payoutPref === "payout" && (
            <input
              type="email"
              placeholder="Payout email (e.g. accounting@yourcompany.com)"
              value={payoutEmail}
              onChange={e => setPayoutEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-input/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
          <Button
            size="sm"
            onClick={() => updatePayoutMutation.mutate()}
            disabled={updatePayoutMutation.isPending}
          >
            {updatePayoutMutation.isPending ? "Saving…" : "Save preference"}
          </Button>
          {updatePayoutMutation.isSuccess && (
            <p className="text-xs text-success font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </p>
          )}
        </div>
      </div>

      {/* Accountant / Tax Attorney Access */}
      <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold">Accountant & Tax Attorney Access</h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Generate a secure, read-only link for your CPA or tax attorney. They see every transaction — commissions, credits, payouts, overages — with full dates and amounts, without touching any settings or client data.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNewLink(v => !v)}>
            <Plus className="h-4 w-4 mr-1" /> Generate Link
          </Button>
        </div>

        {showNewLink && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold">New audit access link</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Who is this for?</label>
                <input
                  type="text"
                  placeholder="e.g. CPA Jane Smith"
                  value={newLinkLabel}
                  onChange={e => setNewLinkLabel(e.target.value)}
                  className="w-full rounded-lg border border-input bg-input/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expiry date (leave blank = no expiry)</label>
                <input
                  type="date"
                  value={newLinkExpiry}
                  onChange={e => setNewLinkExpiry(e.target.value)}
                  className="w-full rounded-lg border border-input bg-input/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createLinkMutation.mutate()} disabled={!newLinkLabel.trim() || createLinkMutation.isPending}>
                {createLinkMutation.isPending ? "Creating…" : "Create link"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewLink(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {auditLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No audit links yet. Generate one above to share with your accountant or tax attorney.
          </p>
        ) : (
          <div className="space-y-2">
            {auditLinks.map(link => {
              const auditUrl = `${origin}/audit/${link.token}`;
              const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
              return (
                <div key={link.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{link.label ?? "Unnamed link"}</p>
                      {!link.is_active && (
                        <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Revoked</span>
                      )}
                      {link.is_active && isExpired && (
                        <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Expired</span>
                      )}
                      {link.is_active && !isExpired && (
                        <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {fmtDate(link.created_at)}
                      {link.expires_at && ` · Expires ${fmtDate(link.expires_at)}`}
                      {link.last_accessed_at && ` · Last viewed ${fmtDate(link.last_accessed_at)}`}
                    </p>
                  </div>
                  {link.is_active && !isExpired && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => copy(auditUrl, link.id)}>
                        {copiedKey === link.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={auditUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => revokeMutation.mutate(link.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg bg-muted/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">What the accountant sees:</strong> Your full transaction ledger — commission earnings, bill credits applied, cash payouts issued, credit pack purchases, and overage charges.
            Dates, amounts, billing periods, and descriptions are all visible and exportable as CSV.
            They cannot see clients, proposals, contractors, or any operational data. Links can be revoked instantly.
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold">Your Referrals</h2>
          <span className="text-xs text-muted-foreground">{referrals.length} total</span>
        </div>
        {referrals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No referrals yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Share your link and start earning 15% recurring commissions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Company", "Plan", "Plan Value", "Your Commission", "Status", "Since"].map(h => (
                    <th key={h} className={`px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider ${["Plan Value", "Your Commission"].includes(h) ? "text-right" : ["Status"].includes(h) ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition">
                    <td className="px-6 py-3">
                      <p className="font-medium">{r.referred_company}</p>
                      {r.referred_email && <p className="text-xs text-muted-foreground">{r.referred_email}</p>}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{r.plan_name}</td>
                    <td className="px-6 py-3 text-right font-medium">{cents(r.plan_amount_cents)}/mo</td>
                    <td className="px-6 py-3 text-right font-bold text-primary">
                      {cents(Math.round(r.plan_amount_cents * r.commission_rate))}/mo
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (r.status === "active"  ? "bg-success/10 text-success" :
                         r.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                         "bg-red-500/10 text-red-400")
                      }>
                        {r.status === "active"  && <BadgeCheck className="h-3 w-3" />}
                        {r.status === "pending" && <Clock className="h-3 w-3" />}
                        {r.status === "churned" && <AlertCircle className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {fmtDate(r.activated_at ?? r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Ledger */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold">Transaction Ledger</h2>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={transactions.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Commissions appear here when referred companies complete their first payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Date", "Type", "Description", "Period", "Amount", "Status"].map(h => (
                    <th key={h} className={`px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider ${h === "Amount" ? "text-right" : h === "Status" ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map(t => {
                  const type = TX_LABELS[t.transaction_type] ?? { label: t.transaction_type, color: "text-muted-foreground bg-muted" };
                  const isIncome = t.transaction_type === "commission_earned";
                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition">
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(t.created_at)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${type.color}`}>{type.label}</span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{t.description ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{t.billing_period ?? "—"}</td>
                      <td className={`px-6 py-3 text-right font-bold ${isIncome ? "text-success" : ""}`}>
                        {isIncome ? "+" : ""}{cents(t.amount_cents)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (t.status === "processed" ? "bg-success/10 text-success" :
                           t.status === "pending"   ? "bg-yellow-500/10 text-yellow-400" :
                           "bg-red-500/10 text-red-400")
                        }>{t.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
