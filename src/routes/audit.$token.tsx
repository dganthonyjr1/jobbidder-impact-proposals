import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { Lock, Download, ShieldCheck, XCircle } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditTx {
  id: string;
  transaction_type: string;
  amount_cents: number;
  description: string | null;
  billing_period: string | null;
  status: string;
  created_at: string;
}

interface AuditPayload {
  companyName: string;
  label: string | null;
  expiresAt: string | null;
  transactions: AuditTx[];
}

// ─── Server Function ────────────────────────────────────────────────────────────

const loadAuditData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1) }).parse(input))
  .handler(async ({ data: { token } }): Promise<AuditPayload | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link } = await supabaseAdmin
      .from("audit_access_links")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!link) return null;

    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
    if (isExpired) return null;

    await supabaseAdmin
      .from("audit_access_links")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", link.id);

    const { data: refCode } = await supabaseAdmin
      .from("referral_codes")
      .select("code, company_name")
      .eq("user_id", link.user_id)
      .maybeSingle();

    if (!refCode) return null;

    const { data: transactions } = await supabaseAdmin
      .from("affiliate_transactions")
      .select("id, transaction_type, amount_cents, description, billing_period, status, created_at")
      .eq("referrer_code", refCode.code)
      .order("created_at", { ascending: false });

    return {
      companyName: refCode.company_name,
      label: link.label,
      expiresAt: link.expires_at,
      transactions: transactions ?? [],
    };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/audit/$token")({
  head: () => ({
    meta: [{ title: "Read-Only Audit Access — Jobbidder" }],
  }),
  component: AuditPortal,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cents(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TX_LABELS: Record<string, { label: string; color: string }> = {
  commission_earned: { label: "Commission Earned",  color: "text-success bg-success/10" },
  credit_applied:    { label: "Credit Applied",     color: "text-blue-600 bg-blue-50" },
  payout_issued:     { label: "Payout Issued",      color: "text-purple-600 bg-purple-50" },
  adjustment:        { label: "Adjustment",         color: "text-orange-600 bg-orange-50" },
  pack_purchase:     { label: "Pack Purchase",      color: "text-slate-600 bg-slate-100" },
  overage_charge:    { label: "Overage Charge",     color: "text-red-600 bg-red-50" },
};

// ─── Component ─────────────────────────────────────────────────────────────────

function AuditPortal() {
  const { token } = Route.useParams();
  const loadFn = useServerFn(loadAuditData);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", token],
    queryFn: () => loadFn({ data: { token } }),
    retry: false,
  });

  function downloadCSV() {
    if (!data) return;
    const rows = [
      ["Date", "Type", "Description", "Period", "Amount", "Status"],
      ...data.transactions.map(t => [
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
    a.href = url;
    a.download = `jobbidder-audit-${data.companyName.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Validating access…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <XCircle className="h-12 w-12 text-destructive opacity-60" />
        <h1 className="font-display text-2xl font-bold">Link Invalid or Expired</h1>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          This audit access link is no longer valid. It may have been revoked by the account holder or has passed its expiry date.
          Please request a new link.
        </p>
      </div>
    );
  }

  const txns = data.transactions;
  const totalCommissions = txns.filter(t => t.transaction_type === "commission_earned").reduce((s, t) => s + t.amount_cents, 0);
  const totalPayouts     = txns.filter(t => t.transaction_type === "payout_issued").reduce((s, t) => s + t.amount_cents, 0);
  const totalCredits     = txns.filter(t => t.transaction_type === "credit_applied").reduce((s, t) => s + t.amount_cents, 0);
  const totalOverages    = txns.filter(t => t.transaction_type === "overage_charge").reduce((s, t) => s + t.amount_cents, 0);
  const totalPacks       = txns.filter(t => t.transaction_type === "pack_purchase").reduce((s, t) => s + t.amount_cents, 0);

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <JobbidderLogo size="md" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Read-only audit access
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Identity Banner */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-bold">{data.companyName} — Financial Audit View</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.label ? `Access granted to: ${data.label} · ` : ""}
                {data.expiresAt ? `Expires ${fmtDate(data.expiresAt)}` : "No expiry"} ·
                {" "}This link is read-only and may be revoked at any time by the account holder.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={txns.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Summary Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Commissions Earned", value: cents(totalCommissions), color: "text-success" },
            { label: "Credits Applied",    value: cents(totalCredits),     color: "" },
            { label: "Cash Payouts",       value: cents(totalPayouts),     color: "" },
            { label: "Credit Pack Purchases", value: cents(totalPacks),   color: "" },
            { label: "Overage Charges",    value: cents(totalOverages),    color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card/60 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
              <p className={`font-bold text-lg mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Transaction Table */}
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold">Full Transaction History</h2>
            <span className="text-xs text-muted-foreground">{txns.length} records</span>
          </div>
          {txns.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No transactions recorded for this account yet.</p>
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
                  {txns.map(t => {
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
                             t.status === "pending"   ? "bg-yellow-50 text-yellow-600" :
                             "bg-red-50 text-red-600")
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

        <p className="text-xs text-muted-foreground text-center pb-4">
          Jobbidder · A product of Sudden Impact Agency · This is a read-only view. Transaction data is provided for accounting and tax purposes only.
        </p>
      </main>
    </div>
  );
}
