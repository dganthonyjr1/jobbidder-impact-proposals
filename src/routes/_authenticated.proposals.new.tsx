import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateProposal } from "@/lib/proposals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STATE_LIST } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/proposals/new")({
  head: () => ({ meta: [{ title: "New Proposal — Jobbidder" }] }),
  component: NewProposalPage,
});

function NewProposalPage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateProposal);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "",
    job_address: "", job_state: "", trade_type: "",
    job_description: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await gen({ data: {
        client_name: form.client_name,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        job_address: form.job_address || null,
        job_state: form.job_state || null,
        trade_type: form.trade_type || null,
        job_description: form.job_description,
      } });
      toast.success(`Generated ${res.proposal_number}`);
      navigate({ to: "/p/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">New AI Proposal</h1>
      <p className="text-muted-foreground mb-8">Enter the job details — AI will draft scope, materials, labor and tiers in seconds.</p>
      <Card className="p-6 bg-card border-border">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Client name *</Label><Input required value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
            <div><Label>Trade type</Label><Input value={form.trade_type} onChange={(e) => set("trade_type", e.target.value)} placeholder="Flooring, HVAC…" /></div>
            <div><Label>Email</Label><Input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} /></div>
            <div className="col-span-2"><Label>Job address</Label><Input value={form.job_address} onChange={(e) => set("job_address", e.target.value)} /></div>
            <div>
              <Label>State</Label>
              <select value={form.job_state} onChange={(e) => set("job_state", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {STATE_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Job description *</Label>
            <Textarea required rows={6} value={form.job_description} onChange={(e) => set("job_description", e.target.value)} placeholder="e.g. Install 850 sqft luxury vinyl plank in living room and 2 bedrooms. Remove existing carpet. Standard prep." />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="shadow-glow">
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Generating…" : "Generate proposal with AI"}
          </Button>
        </form>
      </Card>
    </div>
  );
}