import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upgradeEstimate } from "@/lib/estimates.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import { fmt } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/e/$id")({
  component: PublicEstimate,
  head: () => ({ meta: [{ title: "Your estimate" }] }),
});

function PublicEstimate() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const upgradeFn = useServerFn(upgradeEstimate);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("estimates").select("*").eq("id", id).maybeSingle();
      if (!data) { setLoading(false); return; }
      setEstimate(data);
      if (data.contractor_id) {
        const { data: c } = await supabase.from("contractors").select("*").eq("id", data.contractor_id).maybeSingle();
        setContractor(c);
      }
      supabase.from("estimate_views").insert({ estimate_id: id, user_agent: navigator.userAgent });
      if (data.status === "draft" || data.status === "sent") {
        supabase.from("estimates").update({ status: "viewed" }).eq("id", id);
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleUpgrade() {
    if (estimate?.upgraded_to_proposal_id) {
      navigate({ to: "/p/$id", params: { id: estimate.upgraded_to_proposal_id } });
      return;
    }
    setUpgrading(true);
    try {
      const res = await upgradeFn({ data: { estimateId: id } });
      toast.success("Generating your full proposal…");
      navigate({ to: "/p/$id", params: { id: res.proposal_id } });
    } catch (e: any) {
      toast.error(e?.message || "Failed to upgrade");
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading estimate…</div>;
  if (!estimate) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground" /><p className="mt-4">Estimate not found</p></div></div>;

  const brand = contractor?.primary_color || "#FF6B00";

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {contractor?.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ background: brand }}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <div className="font-display font-bold">{contractor?.business_name || "Contractor"}</div>
              <div className="text-xs text-muted-foreground">{contractor?.phone} {contractor?.email && `· ${contractor.email}`}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Estimate</div>
            <div className="font-mono text-sm">{estimate.estimate_number}</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">Prepared for {estimate.client_name}</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight capitalize">{estimate.trade_type || "Project"} Estimate</h1>
          {estimate.job_address && <p className="text-muted-foreground mt-2">{estimate.job_address}</p>}
          {estimate.valid_through && (
            <p className="text-xs text-muted-foreground mt-1">Valid through {new Date(estimate.valid_through).toLocaleDateString()}</p>
          )}
        </div>

        {estimate.scope_summary && (
          <Card className="p-6 mb-6">
            <h2 className="font-display font-semibold text-xl mb-3">Scope at a glance</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{estimate.scope_summary}</p>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-xl mb-4">Ballpark range</h2>
          <div className="space-y-3">
            <Row label="Materials" v={`${fmt(Number(estimate.material_low) || 0)} – ${fmt(Number(estimate.material_high) || 0)}`} />
            <Row label="Labor" v={`${fmt(Number(estimate.labor_low) || 0)} – ${fmt(Number(estimate.labor_high) || 0)}`} />
            <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
              <span className="font-display text-lg">Estimated total</span>
              <span className="font-display text-2xl font-bold" style={{ color: brand }}>
                {fmt(Number(estimate.total_low) || 0)} – {fmt(Number(estimate.total_high) || 0)}
              </span>
            </div>
          </div>
          {estimate.timeline_text && (
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="uppercase text-xs tracking-wide">Timeline · </span>{estimate.timeline_text}
            </div>
          )}
        </Card>

        <Card className="p-8 mb-6 border-primary/40 bg-gradient-to-br from-card to-accent/30">
          <h3 className="font-display text-2xl font-bold mb-2">Want the full proposal?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Get a detailed Good / Better / Best breakdown with itemized materials, labor, warranty, payment terms, and a signature line — all powered by the SIA wholesale catalog.
          </p>
          <Button size="lg" className="text-white" style={{ background: brand }} onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? "Generating…" : (
              <>Get the full proposal <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground italic text-center mb-8">
          This is a non-binding ballpark estimate. Final pricing requires an on-site review and may vary based on site conditions, material availability, and scope changes.
        </p>

        <div className="flex flex-col items-center gap-3 mt-12 pt-8 border-t border-border/40">
          <img
            src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/S1DwV6RpRVZL2ZtYEo16/media/689ba94c7b7578a4c3bbeead.jpeg"
            alt="Sudden Impact Agency"
            className="h-12 w-12 rounded-md object-cover opacity-90"
          />
          <p className="text-center text-xs text-muted-foreground">
            Powered by <span className="text-gradient-sia font-semibold">Jobbidder</span> · A product of{" "}
            <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="hover:text-foreground transition">
              Sudden Impact Agency
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono">{v}</span></div>;
}