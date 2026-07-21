import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProposals } from "@/lib/proposals.functions";
import { listEstimates } from "@/lib/estimates.functions";
import { listContractorApplications, updateContractorStatus } from "@/lib/contractors.functions";
import { getCreditUsage } from "@/lib/credits.server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Send, ExternalLink, Phone, Mail, HardHat, CheckCircle, XCircle, Clock, Image as ImageIcon, Trash2, Zap, PackagePlus, AlertTriangle, Sparkles, Circle } from "lucide-react";
import { fmt, computeTotals } from "@/lib/pricing";
import { readPrevailingWage } from "@/lib/prevailing-wage";
import { useState } from "react";
import { toast } from "sonner";
import { listUserMedia, deleteMedia } from "@/lib/media.functions";
import { supabase } from "@/integrations/supabase/client";
import { MediaUpload } from "@/components/media-upload";
import { MediaGallery } from "@/components/media-gallery";

function timeAgo(iso: string | null): string {
  if (!iso) return "Not yet";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-300",
  viewed: "bg-yellow-500/20 text-yellow-300",
  accepted: "bg-green-500/20 text-green-300",
  declined: "bg-red-500/20 text-red-300",
  upgraded: "bg-purple-500/20 text-purple-300",
};

const LANG_FLAGS: Record<string, string> = {
  en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", pt: "🇧🇷", ht: "🇭🇹",
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Jobbidder" }] }),
  component: Dashboard,
});

const TIER_LABELS: Record<string, string> = {
  apprentice: "Apprentice",
  journeyman: "Journeyman",
  master_gc:  "Master GC",
  principal:  "Principal",
  enterprise: "Enterprise",
};

function CreditWidget({ credits }: { credits: NonNullable<Awaited<ReturnType<typeof getCreditUsage>>> }) {
  const { tier, allotment, usedThisPeriod, overageCount, lifetimeCount, packCreditsRemaining, billingPeriod } = credits;

  // Apprentice — lifetime limit display
  if (tier === "apprentice") {
    const used = lifetimeCount ?? 0;
    const remaining = Math.max(0, 2 - used);
    const pct = Math.min(100, (used / 2) * 100);
    return (
      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium">Free Trial · {TIER_LABELS[tier]}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{used} of 2 lifetime AI actions used</span>
            <span>{remaining} remaining</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link to="/pricing" className="text-xs text-primary hover:underline shrink-0">Upgrade plan →</Link>
      </div>
    );
  }

  // Journeyman — unlimited proposals, no credit meter
  if (tier === "journeyman") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex items-center gap-3">
        <Zap className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium">Journeyman · Unlimited proposals</span>
        <span className="text-xs text-muted-foreground ml-auto">Voice, SMS &amp; Doc AI available on Master GC+</span>
      </div>
    );
  }

  // Master GC / Principal / Enterprise — monthly meter
  const pct = allotment > 0 ? Math.min(100, (usedThisPeriod / allotment) * 100) : 0;
  const remaining = Math.max(0, allotment - usedThisPeriod);
  const isOver = usedThisPeriod >= allotment;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-400" : "bg-green-500";
  const [month, year] = [billingPeriod.slice(5, 7), billingPeriod.slice(0, 4)];
  const monthLabel = new Date(`${year}-${month}-01`).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{TIER_LABELS[tier] ?? tier} · AI Credits</span>
          <span className="text-xs text-muted-foreground">{monthLabel}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{usedThisPeriod.toLocaleString()} of {allotment.toLocaleString()} credits used</span>
            {!isOver && <span>{remaining.toLocaleString()} remaining</span>}
            {isOver && <span className="text-red-400">{overageCount} overage credits (billed at $0.50 each)</span>}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {packCreditsRemaining > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 shrink-0">
            <PackagePlus className="h-3.5 w-3.5" />
            {packCreditsRemaining.toLocaleString()} pack credits available
          </div>
        )}
        {isOver && packCreditsRemaining === 0 && (
          <Link to="/pricing" className="text-xs text-primary hover:underline shrink-0">Buy credit pack →</Link>
        )}
      </div>
    </div>
  );
}

const ONBOARDING_DISMISSED_KEY = "jobbidder-onboarding-dismissed";

function OnboardingChecklist({ total, sentCount, accepted, catalogSetup }: { total: number; sentCount: number; accepted: number; catalogSetup: boolean }) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
  );

  const steps = [
    { label: "Set your pricing & add cost-catalog items", done: catalogSetup, to: "/settings" as const },
    { label: "Create your first AI proposal", done: total > 0, to: "/proposals/new" as const },
    { label: "Send a proposal to a client", done: sentCount > 0 || accepted > 0, to: "/proposals/new" as const },
    { label: "Get your first proposal accepted", done: accepted > 0, to: "/dashboard" as const },
  ];
  const allDone = steps.every((s) => s.done);

  if (dismissed || allDone) return null;

  function dismiss() {
    try { localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true"); } catch {}
    setDismissed(true);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Getting started
        </div>
        <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground transition">Dismiss</button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        New here? Start in <Link to="/settings" className="text-primary hover:underline">Settings</Link> to add your license #, trade type, and branding — then work through the steps below. Not sure how something works? Read the <Link to="/guide" className="text-primary hover:underline">Guide</Link>.
      </p>
      <div className="space-y-1.5">
        {steps.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="flex items-center gap-2 text-sm hover:text-foreground transition"
          >
            {s.done ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className={s.done ? "line-through text-muted-foreground" : "text-foreground"}>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const TIER_DISPLAY: Record<string, string> = { good: "Good", better: "Better", best: "Best" };

function WinRateInsights({
  decidedCount,
  winRate,
  tierCounts,
  avgWonOverhead,
  avgLostOverhead,
  tradeBreakdown,
}: {
  decidedCount: number;
  winRate: number | null;
  tierCounts: Record<string, number>;
  avgWonOverhead: number | null;
  avgLostOverhead: number | null;
  tradeBreakdown: { trade: string; won: number; lost: number; total: number; rate: number }[];
}) {
  if (decidedCount < 5) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Win-Rate Insights <Badge variant="secondary" className="text-[10px]">Beta</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Insights show up once you have at least 5 accepted or declined proposals ({decidedCount}/5 so far).
        </p>
      </div>
    );
  }

  const wonTierTotal = tierCounts.good + tierCounts.better + tierCounts.best;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        <Zap className="h-4 w-4 text-primary" />
        Win-Rate Insights <Badge variant="secondary" className="text-[10px]">Beta</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Overall win rate</div>
          <div className="text-2xl font-bold mt-1">{winRate !== null ? `${Math.round(winRate * 100)}%` : "—"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{decidedCount} decided proposals</div>
        </div>
        {wonTierTotal > 0 && (
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tier chosen when won</div>
            <div className="space-y-1">
              {(["good", "better", "best"] as const).map((t) => (
                tierCounts[t] > 0 && (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground">{TIER_DISPLAY[t]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(tierCounts[t] / wonTierTotal) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium">{Math.round((tierCounts[t] / wonTierTotal) * 100)}%</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
        {avgWonOverhead !== null && avgLostOverhead !== null && (
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Overhead: won vs. lost</div>
            <p className="text-xs mt-1.5 leading-relaxed">
              Won proposals average <span className="font-semibold text-foreground">{avgWonOverhead.toFixed(1)}%</span> overhead vs.{" "}
              <span className="font-semibold text-foreground">{avgLostOverhead.toFixed(1)}%</span> on declined ones.
              {avgLostOverhead > avgWonOverhead
                ? " Pricing below your lost-proposal average may improve close rate."
                : " Your losses aren't clearly tied to overhead — likely scope, timing, or fit."}
            </p>
          </div>
        )}
      </div>
      {tradeBreakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Win rate by trade</div>
          <div className="flex flex-wrap gap-3">
            {tradeBreakdown.map((t) => (
              <div key={t.trade} className="text-xs rounded-lg border border-border px-3 py-1.5">
                <span className="font-medium">{t.trade}</span>
                <span className="text-muted-foreground"> — {Math.round(t.rate * 100)}% ({t.won}/{t.total})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CONTRACTOR_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-500/20 text-yellow-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
  pending_docs: "bg-blue-500/20 text-blue-300",
};

function Dashboard() {
  const fetchList = useServerFn(listProposals);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["proposals"], queryFn: () => fetchList() });
  const fetchEstimates = useServerFn(listEstimates);
  const { data: estimates, isLoading: estLoading } = useQuery({ queryKey: ["estimates"], queryFn: () => fetchEstimates() });
  const fetchContractors = useServerFn(listContractorApplications);
  const { data: contractors, isLoading: contractorsLoading } = useQuery({ queryKey: ["contractors"], queryFn: () => fetchContractors() });
  const fetchMedia = useServerFn(listUserMedia);
  const { data: media, isLoading: mediaLoading, refetch: refetchMedia } = useQuery({ queryKey: ["media"], queryFn: () => fetchMedia() });
  // Has the contractor added any of their OWN cost-catalog rows? RLS only returns
  // this user's rows among the non-null contractor_id rows, so any hit = engaged.
  const { data: catalogSetup } = useQuery({
    queryKey: ["catalog-setup"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cost_catalog").select("contractor_id").not("contractor_id", "is", null).limit(1);
      return (data?.length ?? 0) > 0;
    },
  });
  const fetchCredits = useServerFn(getCreditUsage);
  const { data: credits } = useQuery({ queryKey: ["credits"], queryFn: () => fetchCredits() });
  const doDeleteMedia = useServerFn(deleteMedia);
  const doUpdateStatus = useServerFn(updateContractorStatus);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resending, setResending] = useState<string | null>(null);
  const [updatingContractor, setUpdatingContractor] = useState<string | null>(null);

  const proposals = data ?? [];

  // Compute totals for each proposal
  const withTotals = proposals.map((p: any) => {
    const materials = p.materials || [];
    const labor = p.labor || [];
    const tier = p.selected_tier || "better";
    const taxRate = Number(p.tax_rate) || 0.07;
    const totals = computeTotals(materials, labor, tier, taxRate, Number(p.overhead_percentage) || 0);
    return { ...p, _grandTotal: totals.grandTotal };
  });

  // Filter
  const filtered = withTotals.filter((p: any) => {
    const matchSearch = !search ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_phone?.includes(search) ||
      p.proposal_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.trade_type?.toLowerCase().includes(search.toLowerCase()) ||
      p.job_address?.toLowerCase().includes(search.toLowerCase()) ||
      p.job_city?.toLowerCase().includes(search.toLowerCase()) ||
      p.job_zip?.includes(search);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const total = proposals.length;
  const accepted = proposals.filter((p: any) => p.status === "accepted").length;
  const pending = proposals.filter((p: any) => ["sent", "viewed"].includes(p.status)).length;
  const totalRevenue = withTotals
    .filter((p: any) => p.status === "accepted")
    .reduce((sum: number, p: any) => sum + (p._grandTotal || 0), 0);

  // Win-rate pricing insights — derived from real accept/decline outcomes,
  // not a static formula. Every threshold below exists to avoid asserting
  // a pattern off a handful of data points.
  const decided = withTotals.filter((p: any) => p.status === "accepted" || p.status === "declined");
  const wonCount = decided.filter((p: any) => p.status === "accepted").length;
  const winRate = decided.length ? wonCount / decided.length : null;

  const tierCounts: Record<string, number> = { good: 0, better: 0, best: 0 };
  withTotals
    .filter((p: any) => p.status === "accepted")
    .forEach((p: any) => {
      const t = p.selected_tier || "better";
      if (tierCounts[t] !== undefined) tierCounts[t]++;
    });

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const wonOverheads = withTotals.filter((p: any) => p.status === "accepted" && p.overhead_percentage != null).map((p: any) => Number(p.overhead_percentage));
  const lostOverheads = withTotals.filter((p: any) => p.status === "declined" && p.overhead_percentage != null).map((p: any) => Number(p.overhead_percentage));
  const avgWonOverhead = wonOverheads.length >= 3 ? avg(wonOverheads) : null;
  const avgLostOverhead = lostOverheads.length >= 3 ? avg(lostOverheads) : null;

  const tradeStats: Record<string, { won: number; lost: number }> = {};
  decided.forEach((p: any) => {
    const trade = p.trade_type || "Other";
    if (!tradeStats[trade]) tradeStats[trade] = { won: 0, lost: 0 };
    if (p.status === "accepted") tradeStats[trade].won++;
    else tradeStats[trade].lost++;
  });
  const tradeBreakdown = Object.entries(tradeStats)
    .map(([trade, s]) => ({ trade, ...s, total: s.won + s.lost, rate: s.won / (s.won + s.lost) }))
    .filter((t) => t.total >= 3)
    .sort((a, b) => b.total - a.total);

  async function resend(proposalId: string, clientEmail: string) {
    setResending(proposalId);
    try {
      const res = await fetch("/api/public/send-proposal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, recipientEmail: clientEmail }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Proposal resent successfully");
        refetch();
      } else {
        toast.error(json.error || "Failed to resend");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setResending(null);
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected" | "pending_docs") {
    setUpdatingContractor(id);
    try {
      await doUpdateStatus({ data: { id, status } });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success(`Contractor marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingContractor(null);
    }
  }

  const statuses = ["all", "draft", "sent", "viewed", "accepted", "declined"];

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your proposals and estimates.</p>
        </div>
        <Button asChild className="shadow-glow">
          <Link to="/proposals/new"><Plus className="h-4 w-4 mr-2" /> New proposal</Link>
        </Button>
      </div>

      <OnboardingChecklist total={total} sentCount={pending} accepted={accepted} catalogSetup={catalogSetup === true} />

      {/* Credit usage widget */}
      {credits && <CreditWidget credits={credits} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total proposals", value: total },
          { label: "Pending", value: pending },
          { label: "Accepted", value: accepted },
          { label: "Revenue (accepted)", value: fmt(totalRevenue) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <WinRateInsights
        decidedCount={decided.length}
        winRate={winRate}
        tierCounts={tierCounts}
        avgWonOverhead={avgWonOverhead}
        avgLostOverhead={avgLostOverhead}
        tradeBreakdown={tradeBreakdown}
      />

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="proposals">Proposals {data ? `(${data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="estimates">Estimates {estimates ? `(${estimates.length})` : ""}</TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
            Media {media ? `(${media.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="contractors">
            <HardHat className="h-3.5 w-3.5 mr-1.5" />
            Contractors {contractors ? `(${contractors.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          {/* Search + filter bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, trade…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="mt-4 font-display font-semibold">
                  {search || statusFilter !== "all" ? "No matching proposals" : "No proposals yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filter."
                    : "Your Voice AI handles all intake — proposals appear here automatically after each qualified call."}
                </p>
                {!search && statusFilter === "all" && (
                  <Button asChild className="mt-4"><Link to="/proposals/new">Create proposal</Link></Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-4 hover:bg-accent/30 transition flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Client + details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.client_name}</span>
                        <Badge className={STATUS_COLORS[p.status] || ""}>{p.status}</Badge>
                        {readPrevailingWage(p.raw_input)?.notice && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-xs font-semibold" title="May be subject to prevailing wage — verify before sending">
                            <AlertTriangle className="h-3 w-3" /> Prevailing wage
                          </span>
                        )}
                        {p.language && p.language !== "en" && (
                          <span className="text-base" title={p.language}>{LANG_FLAGS[p.language] || ""}</span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">{p.proposal_number}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {p.trade_type || "—"}{p.job_address ? ` · ${p.job_address}${p.job_city ? `, ${p.job_city}` : ""}${p.job_zip ? ` ${p.job_zip}` : ""}` : ""}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        {p.client_email && (
                          <a href={`mailto:${p.client_email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                            <Mail className="h-3 w-3" />{p.client_email}
                          </a>
                        )}
                        {p.client_phone && (
                          <a href={`tel:${p.client_phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                            <Phone className="h-3 w-3" />{p.client_phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Total + actions */}
                    <div className="flex items-center justify-between gap-4 shrink-0 sm:flex-col sm:items-end sm:justify-center">
                      <div className="sm:text-right">
                        <div className="font-mono font-semibold">{p._grandTotal > 0 ? fmt(p._grandTotal) : "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                          {(p.view_count ?? 0) > 0 ? ` · ${p.view_count} view${p.view_count !== 1 ? "s" : ""}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to="/p/$id"
                          params={{ id: p.id }}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </Link>
                        {p.client_email && (
                          <button
                            onClick={() => resend(p.id, p.client_email)}
                            disabled={resending === p.id}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                            title="Resend proposal email & SMS"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {resending === p.id ? "…" : "Resend"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="estimates">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {estLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading…</div>
            ) : !estimates || estimates.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="mt-4 font-display font-semibold">No estimates yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Estimates are generated when callers ask for a quick ballpark during a GoHighLevel voice-agent call.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-4">Estimate #</th>
                    <th className="text-left p-4">Client</th>
                    <th className="text-left p-4">Trade</th>
                    <th className="text-left p-4">State</th>
                    <th className="text-left p-4">Range</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e: any) => (
                    <tr key={e.id} className="border-t border-border hover:bg-accent/30 transition">
                      <td className="p-4 font-mono text-xs">{e.estimate_number}</td>
                      <td className="p-4 font-medium">{e.client_name}</td>
                      <td className="p-4 text-sm text-muted-foreground">{e.trade_type || "—"}</td>
                      <td className="p-4 text-sm">{e.job_state || "—"}</td>
                      <td className="p-4 text-sm font-mono">
                        {e.total_low != null && e.total_high != null
                          ? `${fmt(Number(e.total_low))} – ${fmt(Number(e.total_high))}`
                          : "—"}
                      </td>
                      <td className="p-4"><Badge className={STATUS_COLORS[e.status] || ""}>{e.status}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        {e.upgraded_to_proposal_id ? (
                          <Link to="/p/$id" params={{ id: e.upgraded_to_proposal_id }} target="_blank" className="text-primary text-sm hover:underline">View proposal →</Link>
                        ) : (
                          <Link to="/e/$id" params={{ id: e.id }} target="_blank" className="text-primary text-sm hover:underline">View public →</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="media">
          <div className="space-y-6">
            {/* Upload section */}
            <div className="rounded-xl border border-border bg-card shadow-card p-6">
              <h3 className="font-semibold mb-4">Upload Photos & Videos</h3>
              <MediaUpload
                onUploadComplete={() => {
                  refetchMedia();
                  toast.success("Media uploaded successfully");
                }}
              />
            </div>

            {/* Gallery section */}
            <div className="rounded-xl border border-border bg-card shadow-card p-6">
              <h3 className="font-semibold mb-4">Your Media Library</h3>
              <MediaGallery
                media={(media as any) || []}
                isLoading={mediaLoading}
                editable={true}
                onDelete={async (mediaId) => {
                  await doDeleteMedia({ data: { mediaId } });
                  refetchMedia();
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contractors">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {contractorsLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading…</div>
            ) : !contractors || contractors.length === 0 ? (
              <div className="p-16 text-center">
                <HardHat className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="mt-4 font-display font-semibold">No applications yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Contractor applications submitted via the apply form will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left p-4">Contractor</th>
                      <th className="text-left p-4">Trade / Area</th>
                      <th className="text-left p-4">Experience</th>
                      <th className="text-left p-4">License #</th>
                      <th className="text-left p-4">Documents</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Applied</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractors.map((c: any) => (
                      <tr key={c.id} className="border-t border-border hover:bg-accent/30 transition">
                        <td className="p-4">
                          <div className="font-medium">{c.name}</div>
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />{c.email}
                            </a>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{c.trade_type || "—"}</div>
                          {c.service_area && <div className="text-xs text-muted-foreground mt-0.5">{c.service_area}</div>}
                        </td>
                        <td className="p-4 text-sm">{c.years_experience || "—"}</td>
                        <td className="p-4 text-sm font-mono">{c.license_number || "—"}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {c.license_url && (
                              <a href={c.license_url} target="_blank" rel="noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> License
                              </a>
                            )}
                            {c.insurance_url && (
                              <a href={c.insurance_url} target="_blank" rel="noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> COI
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={CONTRACTOR_STATUS_COLORS[c.status] || ""}>{c.status}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {c.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(c.id, "approved")}
                              disabled={updatingContractor === c.id}
                              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50 mb-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </button>
                          )}
                          {c.status !== "pending_docs" && c.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(c.id, "pending_docs")}
                              disabled={updatingContractor === c.id}
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 mb-1"
                            >
                              <Clock className="h-3.5 w-3.5" /> Needs docs
                            </button>
                          )}
                          {c.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(c.id, "rejected")}
                              disabled={updatingContractor === c.id}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
