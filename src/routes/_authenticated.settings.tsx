import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Jobbidder" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractor, setContractor] = useState<any>(null);
  const [integration, setIntegration] = useState<any>({ contractor_sms_notifications_enabled: false });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [intakeUrl, setIntakeUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("contractors").select("*").eq("user_id", user.id).single();
      setContractor(data);
      setLoading(false);
      setWebhookUrl(`${window.location.origin}/api/public/webhook/ghl?contractor=${data?.id}`);
      if (data?.slug) setIntakeUrl(`${window.location.origin}/intake/${data.slug}`);

      if (data?.id) {
        const { data: existingIntegration } = await supabase
          .from("contractor_integrations")
          .select("*")
          .eq("contractor_id", data.id)
          .maybeSingle();
        setIntegration(existingIntegration || { contractor_id: data.id, contractor_sms_notifications_enabled: false });
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("contractors").update({
      business_name: contractor.business_name,
      phone: contractor.phone,
      email: contractor.email,
      license_number: contractor.license_number,
      trade_type: contractor.trade_type,
      primary_color: contractor.primary_color,
      anthropic_api_key: contractor.anthropic_api_key?.trim() || null,
      logo_url: contractor.logo_url,
      slug: contractor.slug || null,
      business_address: contractor.business_address || null,
    }).eq("id", contractor.id);

    let integrationError: any = null;
    if (!error) {
      const { error: upsertError } = await supabase.from("contractor_integrations").upsert({
        contractor_id: contractor.id,
        ghl_api_token: integration.ghl_api_token?.trim() || null,
        ghl_location_id: integration.ghl_location_id?.trim() || null,
        ghl_from_number: integration.ghl_from_number?.trim() || null,
        ghl_from_email: integration.ghl_from_email?.trim() || null,
        contractor_sms_notifications_enabled: integration.contractor_sms_notifications_enabled === true,
      }, { onConflict: "contractor_id" });
      integrationError = upsertError;
    }

    setSaving(false);
    if (error || integrationError) {
      toast.error(error?.message || integrationError?.message);
    } else {
      toast.success("Saved");
      if (contractor.slug) setIntakeUrl(`${window.location.origin}/intake/${contractor.slug}`);
    }
  }

  if (loading || !contractor) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const set = (k: string, v: string) => setContractor((c: any) => ({ ...c, [k]: v }));
  const setInt = (k: string, v: string | boolean) => setIntegration((i: any) => ({ ...i, [k]: v }));

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Branding, contact info and integrations.</p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Business</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Business name</Label><Input value={contractor.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>
          <div><Label>Trade type</Label><Input value={contractor.trade_type || ""} onChange={(e) => set("trade_type", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={contractor.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={contractor.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>License #</Label><Input value={contractor.license_number || ""} onChange={(e) => set("license_number", e.target.value)} /></div>
          <div><Label>Brand color</Label><Input type="color" value={contractor.primary_color || "#EC4899"} onChange={(e) => set("primary_color", e.target.value)} /></div>
          <div className="col-span-2"><Label>Logo URL</Label><Input value={contractor.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" /></div>
          <div className="col-span-2"><Label>Business address (shown on PDF)</Label><Input value={contractor.business_address || ""} onChange={(e) => set("business_address", e.target.value)} placeholder="123 Main St, Wildwood NJ 08260" /></div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">AI</h2>
        <p className="text-sm text-muted-foreground">Bring your own Anthropic API key for Claude-powered proposals (optional). Otherwise the platform uses its built-in AI gateway.</p>
        <div><Label>Anthropic API key</Label><Input type="password" value={contractor.anthropic_api_key || ""} onChange={(e) => set("anthropic_api_key", e.target.value)} placeholder="sk-ant-…" /></div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Integrations</h2>
        <div>
          <Label>Public intake URL slug</Label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground font-mono shrink-0">/intake/</span>
            <Input
              value={contractor.slug || ""}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
              placeholder="mikes-roofing"
              className="font-mono text-sm"
            />
          </div>
          {intakeUrl && (
            <p className="text-xs mt-2">
              Share this link with leads:&nbsp;
              <a href={intakeUrl} target="_blank" rel="noreferrer" className="font-mono underline break-all">{intakeUrl}</a>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Save changes after editing the slug to update your public intake URL.</p>
        </div>
        <div>
          <Label>GoHighLevel workflow webhook URL</Label>
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground mt-1">
            Use this URL in your GoHighLevel workflow webhook action after the voice agent captures a lead. {" "}
            <a href="/ghl-setup" className="underline text-foreground">Full GoHighLevel setup guide →</a>
          </p>
        </div>
        <div className="border-t pt-4 space-y-3">
          <div>
            <h3 className="font-display font-semibold">Contractor-owned GoHighLevel</h3>
            <p className="text-sm text-muted-foreground">
              Optional. Add the contractor's own GHL Private Integration Token and location details so proposal contacts, emails, and SMS are created in that contractor's sub-account instead of the platform fallback account.
            </p>
          </div>
          <div><Label>GHL Private Integration Token</Label><Input type="password" value={integration.ghl_api_token || ""} onChange={(e) => setInt("ghl_api_token", e.target.value)} placeholder="pit-…" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>GHL Location ID</Label><Input value={integration.ghl_location_id || ""} onChange={(e) => setInt("ghl_location_id", e.target.value)} placeholder="Location/sub-account ID" /></div>
            <div><Label>SMS From Number</Label><Input value={integration.ghl_from_number || ""} onChange={(e) => setInt("ghl_from_number", e.target.value)} placeholder="+15551234567" /></div>
          </div>
          <div><Label>Email From Address</Label><Input value={integration.ghl_from_email || ""} onChange={(e) => setInt("ghl_from_email", e.target.value)} placeholder="proposals@contractor.com" /></div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={integration.contractor_sms_notifications_enabled === true}
              onChange={(e) => setInt("contractor_sms_notifications_enabled", e.target.checked)}
            />
            <span>
              Send contractor status notifications by SMS. Leave this off for email-only owner/test notifications. Customer proposal/estimate SMS remains controlled by each webhook/test payload.
            </span>
          </label>
        </div>
      </Card>

      <Button onClick={save} disabled={saving} size="lg" className="shadow-glow">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
