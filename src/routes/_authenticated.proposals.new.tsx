import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateProposal } from "@/lib/proposals.functions";
import { extractSpecSystems, type ExtractedSystem } from "@/lib/spec-extraction.server";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft, UploadCloud, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { STATE_LIST, JOB_DESCRIPTION_MAX_LENGTH } from "@/lib/pricing";
import { UpgradeModal } from "@/components/UpgradeModal";

const UPGRADE_URLS: Record<string, string> = {
  Journeyman: "https://link.suddenimpactagency.io/payment-link/6a402a42390a6e280643af94",
  "Master GC": "https://link.suddenimpactagency.io/payment-link/6a402ae09b12592b36824ddb",
  Principal:   "https://link.suddenimpactagency.io/payment-link/6a402b3a9b12592b36824ddd",
};

function creditErrorPlan(msg: string): { plan: string; url: string } | null {
  if (msg.includes("Journeyman") || msg.includes("free AI action")) {
    return { plan: "Journeyman", url: UPGRADE_URLS.Journeyman };
  }
  if (msg.includes("Master GC") || msg.includes("voice") || msg.includes("SMS") || msg.includes("document")) {
    return { plan: "Master GC", url: UPGRADE_URLS["Master GC"] };
  }
  if (msg.includes("Credit limit") || msg.includes("credits")) {
    return { plan: "Master GC", url: UPGRADE_URLS["Master GC"] };
  }
  return null;
}

export const Route = createFileRoute("/_authenticated/proposals/new")({
  head: () => ({ meta: [{ title: "New Proposal — Jobbidder" }] }),
  component: NewProposalPage,
});

function NewProposalPage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateProposal);
  const extractSpec = useServerFn(extractSpecSystems);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [systems, setSystems] = useState<ExtractedSystem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [upgradeInfo, setUpgradeInfo] = useState<{ plan: string; url: string; feature: string } | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "",
    job_address: "", job_address2: "", job_city: "", job_state: "", job_zip: "", trade_type: "",
    job_description: "", prevailing_wage: "",
  });

  async function handleSpecUpload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF spec document.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Spec PDF exceeds 20 MB.");
      return;
    }
    setExtracting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in again."); return; }
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("proposal-specs").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) { toast.error(uploadError.message); return; }

      const result = await extractSpec({ data: { path, fileName: file.name } });
      if (!result.systems.length) {
        toast.error("Couldn't find any distinct systems in that document. Try pasting the scope into the job description instead.");
        return;
      }
      setSystems(result.systems);
      setUploadedFileName(file.name);
      toast.success(`Found ${result.systems.length} system${result.systems.length === 1 ? "" : "s"} — review below before generating.`);
    } catch (err: any) {
      toast.error(err?.message || "Extraction failed. Try again or paste the scope manually.");
    } finally {
      setExtracting(false);
    }
  }

  function updateSystem(i: number, patch: Partial<ExtractedSystem>) {
    setSystems((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSystem(i: number) {
    setSystems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addSystem() {
    setSystems((prev) => [...prev, { name: "", description: "", unit_hint: "" }]);
  }

  // Map the Yes/No/Not Sure answer to the flag + source the engine expects.
  const PW_MAP: Record<string, { flag: string; source: string }> = {
    yes: { flag: "true", source: "direct_answer" },
    no: { flag: "false", source: "direct_answer" },
    notsure: { flag: "unknown", source: "uncertain" },
  };

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.job_description.length > JOB_DESCRIPTION_MAX_LENGTH) {
      setFormError(
        `Job description is ${form.job_description.length.toLocaleString()} characters — over the ${JOB_DESCRIPTION_MAX_LENGTH.toLocaleString()} limit. Shorten it and try again; nothing was submitted.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await gen({ data: {
        client_name: form.client_name,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        job_address: form.job_address || null,
        job_address2: form.job_address2 || null,
        job_city: form.job_city || null,
        job_state: form.job_state || null,
        job_zip: form.job_zip || null,
        trade_type: form.trade_type || null,
        job_description: form.job_description,
        prevailing_wage_flag: PW_MAP[form.prevailing_wage]?.flag ?? null,
        prevailing_wage_source: PW_MAP[form.prevailing_wage]?.source ?? null,
        extracted_systems: systems.filter((s) => s.name.trim()).length ? systems.filter((s) => s.name.trim()) : undefined,
      } });
      toast.success(`Generated ${res.proposal_number}`);
      navigate({ to: "/p/$id", params: { id: res.id } });
    } catch (err: any) {
      const msg: string = err.message || "Failed to generate";
      const plan = creditErrorPlan(msg);
      if (plan) {
        setUpgradeInfo({ plan: plan.plan, url: plan.url, feature: "AI Proposals" });
      } else {
        toast.error(msg);
        setFormError(msg);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <UpgradeModal
        open={!!upgradeInfo}
        onClose={() => setUpgradeInfo(null)}
        featureName={upgradeInfo?.feature ?? "AI Proposals"}
        requiredPlan={upgradeInfo?.plan ?? "Journeyman"}
        upgradeUrl={upgradeInfo?.url ?? UPGRADE_URLS.Journeyman}
      />
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-5 w-5" /> Back to dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">New AI Proposal</h1>
      <p className="text-muted-foreground mb-8">Enter the job details — AI will draft scope, materials, labor and tiers in seconds.</p>
      {formError && (
        <div role="alert" className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}
      <Card className="p-6 bg-card border-border">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Client name *</Label><Input required value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
            <div><Label>Trade type</Label><Input value={form.trade_type} onChange={(e) => set("trade_type", e.target.value)} placeholder="Flooring, HVAC, Moving…" /></div>
            <div><Label>Email</Label><Input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Job address</Label><Input value={form.job_address} onChange={(e) => set("job_address", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Address line 2 <span className="text-muted-foreground text-xs">(suite, unit, etc.)</span></Label><Input value={form.job_address2} onChange={(e) => set("job_address2", e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.job_city} onChange={(e) => set("job_city", e.target.value)} /></div>
            <div>
              <Label>State</Label>
              <select value={form.job_state} onChange={(e) => set("job_state", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <option value="">—</option>
                {STATE_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Zip code</Label>
              <Input
                value={form.job_zip}
                onChange={(e) => set("job_zip", e.target.value)}
                inputMode="numeric"
                maxLength={10}
                placeholder="90210"
              />
            </div>
          </div>
          <div>
            <Label>Is this for a government agency, school, municipality, or does it involve any public funding, grants, or tax incentives?</Label>
            <select value={form.prevailing_wage} onChange={(e) => set("prevailing_wage", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base text-foreground mt-1">
              <option value="">Select…</option>
              <option value="no">No — private job</option>
              <option value="yes">Yes — government / school / public-funded</option>
              <option value="notsure">Not sure</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Flags the proposal for a prevailing-wage check so public jobs aren't priced at market rate by mistake.</p>
          </div>
          <div>
            <Label>Job description *</Label>
            <Textarea
              required
              rows={6}
              value={form.job_description}
              onChange={(e) => { set("job_description", e.target.value); setFormError(null); }}
              placeholder="e.g. Install 850 sqft luxury vinyl plank in living room and 2 bedrooms. Remove existing carpet. Standard prep. Paste the full spec — up to 50,000 characters."
            />
            <p className={`text-xs mt-1 ${form.job_description.length > JOB_DESCRIPTION_MAX_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {form.job_description.length.toLocaleString()} / {JOB_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters
              {form.job_description.length > JOB_DESCRIPTION_MAX_LENGTH ? " — over the limit, shorten before submitting" : ""}
            </p>
          </div>

          <div>
            <Label>Or upload the architect's spec (PDF)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              We'll read the full document and pull out every distinct system to price — no character limit, nothing gets dropped.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={extracting}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSpecUpload(f); e.target.value = ""; }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={extracting}>
              {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reading spec…</> : <><UploadCloud className="h-4 w-4 mr-2" /> Upload spec PDF</>}
            </Button>
            {uploadedFileName && !extracting && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {uploadedFileName}</p>
            )}
          </div>

          {systems.length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Systems found in the spec — review before generating</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addSystem}>+ Add system</Button>
              </div>
              <div className="space-y-3">
                {systems.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start rounded-md bg-muted/40 p-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={s.name}
                          onChange={(e) => updateSystem(i, { name: e.target.value })}
                          placeholder="System name"
                          className="flex-1"
                        />
                        <Input
                          value={s.unit_hint}
                          onChange={(e) => updateSystem(i, { unit_hint: e.target.value })}
                          placeholder="Unit (sq ft…)"
                          className="w-32"
                        />
                      </div>
                      <Textarea
                        value={s.description}
                        onChange={(e) => updateSystem(i, { description: e.target.value })}
                        rows={2}
                        placeholder="Scope for this system"
                        className="text-sm"
                      />
                    </div>
                    <button type="button" onClick={() => removeSystem(i)} className="text-muted-foreground hover:text-destructive mt-2" aria-label="Remove system">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Every system listed here will be priced individually — edit or remove any that don't apply.</p>
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="shadow-glow">
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Generating…" : "Generate proposal with AI"}
          </Button>
        </form>
      </Card>
    </div>
  );
}