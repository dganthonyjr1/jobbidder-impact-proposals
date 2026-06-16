import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/intake/$slug")({
  head: () => ({ meta: [{ title: "Request your estimate" }] }),
  component: IntakeForm,
});

function IntakeForm() {
  const { slug } = Route.useParams();
  const [contractor, setContractor] = useState<{ business_name: string; primary_color: string | null; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ url: string } | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "",
    job_address: "", trade_type: "", job_description: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contractors")
        .select("business_name, primary_color, logo_url")
        .eq("slug", slug)
        .maybeSingle();
      setContractor(data);
      setLoading(false);
    })();
  }, [slug]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/intake-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Submission failed");
      setDone({ url: json.proposal_url });
    } catch (err: any) {
      toast.error(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Not found</h1>
          <p className="text-muted-foreground mt-2">This intake link isn't active.</p>
        </Card>
      </div>
    );
  }

  const brand = contractor.primary_color || "#EC4899";

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="p-10 max-w-lg text-center">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-400" />
          <h1 className="font-display text-3xl font-bold mt-4">Thanks — we're on it</h1>
          <p className="text-muted-foreground mt-3">
            {contractor.business_name} just received your request. We're drafting your estimate now and you'll get it by email and text within a few minutes.
          </p>
          <a href={done.url} className="inline-block mt-6 text-sm underline">View your proposal</a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          {contractor.logo_url ? (
            <img src={contractor.logo_url} alt="" className="h-12 w-auto" />
          ) : (
            <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: brand }}>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Free estimate from</div>
            <h1 className="font-display text-2xl font-bold">{contractor.business_name}</h1>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold mb-1">Tell us about your project</h2>
          <p className="text-sm text-muted-foreground mb-6">We'll send you a detailed proposal within a few minutes.</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Your name *</Label><Input required value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
              <div><Label>Phone *</Label><Input required type="tel" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Email *</Label><Input required type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Job address</Label><Input value={form.job_address} onChange={(e) => set("job_address", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Job type</Label><Input value={form.trade_type} onChange={(e) => set("trade_type", e.target.value)} placeholder="Roof replacement, kitchen remodel…" /></div>
            </div>
            <div>
              <Label>Describe what you need *</Label>
              <Textarea required rows={5} value={form.job_description} onChange={(e) => set("job_description", e.target.value)} placeholder="The more detail you share, the more accurate your estimate." />
            </div>
            <div className="space-y-3">
              <Button type="submit" size="lg" disabled={submitting} className="text-white w-full sm:w-auto" style={{ background: brand }}>
                <Sparkles className="h-4 w-4 mr-2" />
                {submitting ? "Submitting…" : "Get my estimate"}
              </Button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By submitting, you authorize <strong>{contractor.business_name}</strong> (powered by Jobbidder / Sudden Impact Agency LLC) to send you transactional text messages and emails about your estimate at the contact info above, possibly using automated technology. Msg &amp; data rates may apply. Message frequency varies. Consent is not a condition of purchase. Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.{' '}
                <a href="/sms-terms" target="_blank" className="underline">SMS Terms</a>{' '}·{' '}
                <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}