import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreditUsage, getCreditHistory } from "@/lib/credits.server";
import { Badge } from "@/components/ui/badge";
import { Zap, PackagePlus, CreditCard, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account & Billing — Jobbidder" }] }),
  component: AccountPage,
});

const TIER_LABELS: Record<string, string> = {
  apprentice: "Apprentice (Free)",
  journeyman: "Journeyman — $497/mo",
  master_gc:  "Master GC — $997/mo",
  principal:  "Principal — $1,997/mo",
  enterprise: "Enterprise — $3,500/mo",
};

const TIER_ALLOTMENT: Record<string, string> = {
  apprentice: "2 lifetime AI actions",
  journeyman: "Unlimited proposals",
  master_gc:  "500 credits/month",
  principal:  "2,000 credits/month",
  enterprise: "10,000 credits/month",
};

const ACTION_LABELS: Record<string, string> = {
  proposal:              "Proposal",
  voice_prequal:         "Voice Pre-qual",
  document_extraction:   "Document Extraction",
  sms_sequence:          "SMS Sequence",
  verification_report:   "Verification Report",
  renewal_alert:         "Renewal Alert",
};

const PACK_LABELS: Record<string, string> = {
  starter: "Starter Pack — 1,000 credits",
  growth:  "Growth Pack — 5,000 credits",
  scale:   "Scale Pack — 15,000 credits",
};

function AccountPage() {
  const fetchUsage = useServerFn(getCreditUsage);
  const fetchHistory = useServerFn(getCreditHistory);
  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ["credits"], queryFn: () => fetchUsage() });
  const { data: history, isLoading: histLoading } = useQuery({ queryKey: ["credit-history"], queryFn: () => fetchHistory() });

  const tier = usage?.tier ?? "apprentice";
  const allotment = usage?.allotment ?? 0;
  const usedThisPeriod = usage?.usedThisPeriod ?? 0;
  const overageCount = usage?.overageCount ?? 0;
  const packCreditsRemaining = usage?.packCreditsRemaining ?? 0;
  const billingPeriod = usage?.billingPeriod ?? "";
  const lifetimeCount = usage?.lifetimeCount ?? null;

  const pct = allotment > 0 ? Math.min(100, (usedThisPeriod / allotment) * 100) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-green-500";
  const monthLabel = billingPeriod
    ? new Date(`${billingPeriod}-01`).toLocaleString("default", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Account &amp; Billing</h1>
        <p className="text-muted-foreground mt-1">Your plan, credit usage, and purchase history.</p>
      </div>

      {/* Plan card */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current plan</div>
            <div className="text-xl font-semibold">{TIER_LABELS[tier] ?? tier}</div>
            <div className="text-sm text-muted-foreground mt-1">{TIER_ALLOTMENT[tier] ?? ""}</div>
          </div>
          <Link
            to="/pricing"
            className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-4 py-2 hover:bg-primary/10 transition"
          >
            <ArrowUpRight className="h-4 w-4" /> Upgrade plan
          </Link>
        </div>
      </div>

      {/* Credit meter */}
      {!usageLoading && usage && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Credit usage {monthLabel && `— ${monthLabel}`}</h2>
          </div>

          {tier === "apprentice" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{lifetimeCount ?? 0} of 2 lifetime AI actions used</span>
                <span className="text-muted-foreground">{Math.max(0, 2 - (lifetimeCount ?? 0))} remaining</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: `${Math.min(100, ((lifetimeCount ?? 0) / 2) * 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Upgrade to Journeyman or higher to unlock unlimited proposals.
              </p>
            </div>
          )}

          {tier === "journeyman" && (
            <p className="text-sm text-muted-foreground">
              Unlimited proposals included. Upgrade to Master GC+ to unlock Voice AI, SMS sequences, and document extraction.
            </p>
          )}

          {!["apprentice", "journeyman"].includes(tier) && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{usedThisPeriod.toLocaleString()} of {allotment.toLocaleString()} credits used</span>
                <span className="text-muted-foreground">
                  {Math.max(0, allotment - usedThisPeriod).toLocaleString()} remaining
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-lg font-bold">{usedThisPeriod.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Used this month</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-lg font-bold text-green-400">{packCreditsRemaining.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Pack credits</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className={`text-lg font-bold ${overageCount > 0 ? "text-red-400" : ""}`}>{overageCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Overage (@ $0.50 ea)</div>
                </div>
              </div>
              {overageCount > 0 && (
                <p className="text-xs text-red-400 mt-3">
                  You have {overageCount} overage credits this month (${(overageCount * 0.5).toFixed(2)} to be invoiced).
                  <Link to="/pricing" className="ml-2 underline">Buy a pack to avoid overage →</Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pack purchases */}
      {history && history.packs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <PackagePlus className="h-4 w-4 text-green-400" />
            <h2 className="font-semibold">Add-on credit packs</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left pb-3">Pack</th>
                <th className="text-left pb-3">Purchased</th>
                <th className="text-right pb-3">Total</th>
                <th className="text-right pb-3">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {history.packs.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-3">{PACK_LABELS[p.pack_name] ?? p.pack_name}</td>
                  <td className="py-3 text-muted-foreground">{new Date(p.purchased_at).toLocaleDateString()}</td>
                  <td className="py-3 text-right font-mono">{p.credits_total.toLocaleString()}</td>
                  <td className="py-3 text-right font-mono">
                    <span className={p.credits_remaining === 0 ? "text-muted-foreground" : "text-green-400"}>
                      {p.credits_remaining.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-border">
            <Link to="/pricing" className="text-sm text-primary hover:underline">Buy more credits →</Link>
          </div>
        </div>
      )}

      {/* Credit action log */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">AI action log</h2>
          <span className="text-xs text-muted-foreground ml-auto">Last 50 entries</span>
        </div>
        {histLoading ? (
          <div className="text-muted-foreground text-sm py-8 text-center">Loading…</div>
        ) : !history || history.ledger.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8 text-center">No AI actions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left pb-3">Date</th>
                  <th className="text-left pb-3">Action</th>
                  <th className="text-left pb-3">Period</th>
                  <th className="text-right pb-3">Credits</th>
                  <th className="text-left pb-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {history.ledger.map((row: any) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        {ACTION_LABELS[row.action_type] ?? row.action_type}
                        {row.is_overage && (
                          <Badge className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0">overage</Badge>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground font-mono text-xs">{row.billing_period}</td>
                    <td className="py-2.5 text-right font-mono">
                      {row.credits_used === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={row.is_overage ? "text-red-400" : ""}>{row.credits_used}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {row.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
