import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProposals } from "@/lib/proposals.functions";
import { listEstimates } from "@/lib/estimates.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus } from "lucide-react";
import { fmt } from "@/lib/pricing";

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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Jobbidder" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchList = useServerFn(listProposals);
  const { data, isLoading } = useQuery({ queryKey: ["proposals"], queryFn: () => fetchList() });
  const fetchEstimates = useServerFn(listEstimates);
  const { data: estimates, isLoading: estLoading } = useQuery({ queryKey: ["estimates"], queryFn: () => fetchEstimates() });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-500/20 text-blue-300",
    viewed: "bg-yellow-500/20 text-yellow-300",
    accepted: "bg-green-500/20 text-green-300",
    declined: "bg-red-500/20 text-red-300",
    upgraded: "bg-purple-500/20 text-purple-300",
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage your estimates and proposals.</p>
        </div>
        <Button asChild className="shadow-glow">
          <Link to="/proposals/new"><Plus className="h-4 w-4 mr-2" /> New proposal</Link>
        </Button>
      </div>

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="proposals">Proposals {data ? `(${data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="estimates">Estimates {estimates ? `(${estimates.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-4 font-display font-semibold">No proposals yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first proposal or wire up the GoHighLevel workflow webhook.</p>
            <Button asChild className="mt-4"><Link to="/proposals/new">Create proposal</Link></Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-4">Proposal #</th>
                <th className="text-left p-4">Client</th>
                <th className="text-left p-4">Trade</th>
                <th className="text-left p-4">State</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Views</th>
                <th className="text-left p-4">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/30 transition">
                  <td className="p-4 font-mono text-xs">{p.proposal_number}</td>
                  <td className="p-4 font-medium">{p.client_name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.trade_type || "—"}</td>
                  <td className="p-4 text-sm">{p.job_state || "—"}</td>
                  <td className="p-4"><Badge className={statusColors[p.status] || ""}>{p.status}</Badge></td>
                  <td className="p-4 text-sm">
                    {((p as any).view_count ?? 0) > 0 ? (
                      <span className="text-foreground">
                        {(p as any).view_count} <span className="text-muted-foreground">· {timeAgo((p as any).last_viewed_at)}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Link to="/p/$id" params={{ id: p.id }} target="_blank" className="text-primary text-sm hover:underline">View public →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  {estimates.map((e) => (
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
                      <td className="p-4"><Badge className={statusColors[e.status] || ""}>{e.status}</Badge></td>
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
      </Tabs>
    </div>
  );
}