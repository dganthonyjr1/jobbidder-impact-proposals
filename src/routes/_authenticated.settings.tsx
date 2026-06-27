import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Jobbidder" }] }),
  component: SettingsPage,
});

// Default pricing settings for a new contractor
const DEFAULT_PRICING: PricingSettings = {
  trades: {
    default: { labor_rate: 65, material_markup: 35, overhead: 12, profit_margin: 20 },
    roofing: { labor_rate: 70, material_markup: 40, overhead: 12, profit_margin: 22 },
    hvac: { labor_rate: 85, material_markup: 35, overhead: 14, profit_margin: 22 },
    plumbing: { labor_rate: 90, material_markup: 35, overhead: 14, profit_margin: 22 },
    electrical: { labor_rate: 95, material_markup: 30, overhead: 14, profit_margin: 20 },
    remodeling: { labor_rate: 75, material_markup: 38, overhead: 13, profit_margin: 22 },
    painting: { labor_rate: 55, material_markup: 30, overhead: 10, profit_margin: 20 },
    flooring: { labor_rate: 60, material_markup: 35, overhead: 11, profit_margin: 20 },
    landscaping: { labor_rate: 50, material_markup: 30, overhead: 10, profit_margin: 18 },
  },
  tier_spread: { good: 0, better: 18, best: 38 },
  tax_rate: 7,
  payment_terms: "50% deposit, 50% on completion",
  warranty_default: "1-year workmanship warranty on all labor",
};

interface TradeRate {
  labor_rate: number;
  material_markup: number;
  overhead: number;
  profit_margin: number;
}

interface PricingSettings {
  trades: Record<string, TradeRate>;
  tier_spread: { good: number; better: number; best: number };
  tax_rate: number;
  payment_terms: string;
  warranty_default: string;
}

const TRADE_LABELS: Record<string, string> = {
  default: "Default (all trades)",
  roofing: "Roofing",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  remodeling: "Remodeling / General",
  painting: "Painting",
  flooring: "Flooring",
  landscaping: "Landscaping",
};

const WHITE_LABEL_TIERS = ["master_gc", "principal", "enterprise"];

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractor, setContractor] = useState<any>(null);
  const [integration, setIntegration] = useState<any>({ contractor_sms_notifications_enabled: false });
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"business" | "pricing" | "integrations">("business");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("contractors").select("*").eq("user_id", user.id).single();
      setContractor(data);
      setLoading(false);
      setWebhookUrl(`${window.location.origin}/api/public/webhook/ghl?contractor=${data?.id}`);

      // Load pricing settings if they exist
      if (data?.pricing_settings) {
        setPricing({ ...DEFAULT_PRICING, ...data.pricing_settings });
      }

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
      pricing_settings: pricing,
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
      toast.success("Settings saved");
    }
  }

  const setTrade = (trade: string, field: keyof TradeRate, value: string) => {
    const num = parseFloat(value) || 0;
    setPricing((p) => ({
      ...p,
      trades: { ...p.trades, [trade]: { ...p.trades[trade], [field]: num } },
    }));
  };

  if (loading || !contractor) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const set = (k: string, v: string) => setContractor((c: any) => ({ ...c, [k]: v }));
  const setInt = (k: string, v: string | boolean) => setIntegration((i: any) => ({ ...i, [k]: v }));

  const isWhiteLabel = WHITE_LABEL_TIERS.includes(contractor.subscription_tier ?? "");
  const intakeUrl = contractor.slug
    ? `${window.location.origin}/go/${contractor.slug}`
    : null;

  function copyIntakeUrl() {
    if (!intakeUrl) return;
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs = [
    { id: "business", label: "Business" },
    { id: "pricing", label: "Pricing & AI" },
    { id: "integrations", label: "Integrations" },
  ] as const;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Branding, pricing parameters, and integrations.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === t.id
                ? "bg-card border border-b-card border-border text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BUSINESS TAB ── */}
      {activeTab === "business" && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Business Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Business name</Label><Input value={contractor.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>
            <div><Label>Trade type</Label><Input value={contractor.trade_type || ""} onChange={(e) => set("trade_type", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={contractor.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={contractor.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>License #</Label><Input value={contractor.license_number || ""} onChange={(e) => set("license_number", e.target.value)} /></div>
            <div><Label>Brand color</Label><Input type="color" value={contractor.primary_color || "#EC4899"} onChange={(e) => set("primary_color", e.target.value)} /></div>
            <div className="col-span-2">
              <Label>Business Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {contractor.logo_url && (
                  <img src={contractor.logo_url} alt="Logo" className="h-12 w-auto rounded border border-border object-contain bg-white p-1" />
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split(".").pop();
                      const path = `logos/${contractor.id}.${ext}`;
                      const { error } = await supabase.storage.from("job-photos").upload(path, file, { upsert: true, contentType: file.type });
                      if (error) { toast.error("Upload failed: " + error.message); return; }
                      const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
                      set("logo_url", pub.publicUrl);
                      toast.success("Logo uploaded — click Save to apply");
                    }}
                  />
                  <Input value={contractor.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="Or paste a logo URL: https://…" className="text-xs" />
                </div>
              </div>
            </div>
            <div className="col-span-2"><Label>Business address (shown on PDF)</Label><Input value={contractor.business_address || ""} onChange={(e) => set("business_address", e.target.value)} placeholder="123 Main St, Wildwood NJ 08260" /></div>
            <div className="col-span-2">
              <Label>Intake page slug</Label>
              <Input
                value={contractor.slug || ""}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
                placeholder="e.g. mikes-roofing"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used in your client intake URL. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          {/* White-label intake link — Master GC+ only */}
          {isWhiteLabel && contractor.slug && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">Your branded client intake link</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Share this with clients — they see your brand, logo, and colors. No Jobbidder branding.
                  </p>
                  <code className="text-xs text-primary break-all">{intakeUrl}</code>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={copyIntakeUrl}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/50 transition"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={intakeUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </a>
                </div>
              </div>
            </div>
          )}
          {isWhiteLabel && !contractor.slug && (
            <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-600">
              Set your intake page slug above to activate your white-label client intake link.
            </div>
          )}
          {!isWhiteLabel && (
            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              White-label intake pages are available on <strong>Master GC</strong> and above.{" "}
              <a href="/pricing" className="text-primary underline">Upgrade your plan →</a>
            </div>
          )}
        </Card>
      )}

      {/* ── PRICING TAB ── */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="font-display font-semibold text-lg">Per-Trade Labor & Markup</h2>
              <p className="text-sm text-muted-foreground mt-1">
                These rates are injected directly into the Claude AI prompt. Every proposal generated for your account will use these exact numbers instead of Claude's estimates.
                Set the <strong>Default</strong> row as your baseline — Claude uses it for any trade not listed below.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 font-medium w-40">Trade</th>
                    <th className="text-right py-2 px-3 font-medium">Labor Rate ($/hr)</th>
                    <th className="text-right py-2 px-3 font-medium">Material Markup (%)</th>
                    <th className="text-right py-2 px-3 font-medium">Overhead (%)</th>
                    <th className="text-right py-2 pl-3 font-medium">Profit Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(TRADE_LABELS).map(([key, label]) => {
                    const t = pricing.trades[key] || DEFAULT_PRICING.trades.default;
                    return (
                      <tr key={key} className={key === "default" ? "bg-muted/30" : ""}>
                        <td className="py-2 pr-4 font-medium text-foreground">{label}</td>
                        <td className="py-1 px-3">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={t.labor_rate}
                            onChange={(e) => setTrade(key, "labor_rate", e.target.value)}
                            className="text-right h-8 w-24 ml-auto"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            step={1}
                            value={t.material_markup}
                            onChange={(e) => setTrade(key, "material_markup", e.target.value)}
                            className="text-right h-8 w-24 ml-auto"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={t.overhead}
                            onChange={(e) => setTrade(key, "overhead", e.target.value)}
                            className="text-right h-8 w-24 ml-auto"
                          />
                        </td>
                        <td className="py-1 pl-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={t.profit_margin}
                            onChange={(e) => setTrade(key, "profit_margin", e.target.value)}
                            className="text-right h-8 w-24 ml-auto"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-display font-semibold text-lg">Good / Better / Best Tier Spread</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Define how much more the Better and Best tiers cost relative to Good. Good is always the base price (0% premium).
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Good — premium over base (%)</Label>
                <Input
                  type="number"
                  min={0}
                  value={pricing.tier_spread.good}
                  disabled
                  className="text-right opacity-60"
                />
                <p className="text-xs text-muted-foreground mt-1">Always 0% — this is the base price</p>
              </div>
              <div>
                <Label>Better — premium over Good (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={pricing.tier_spread.better}
                  onChange={(e) => setPricing((p) => ({ ...p, tier_spread: { ...p.tier_spread, better: parseFloat(e.target.value) || 0 } }))}
                  className="text-right"
                />
              </div>
              <div>
                <Label>Best — premium over Good (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={pricing.tier_spread.best}
                  onChange={(e) => setPricing((p) => ({ ...p, tier_spread: { ...p.tier_spread, best: parseFloat(e.target.value) || 0 } }))}
                  className="text-right"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">Proposal Defaults</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={0.1}
                  value={pricing.tax_rate}
                  onChange={(e) => setPricing((p) => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="text-right"
                />
              </div>
              <div>
                <Label>Default warranty language</Label>
                <Input
                  value={pricing.warranty_default}
                  onChange={(e) => setPricing((p) => ({ ...p, warranty_default: e.target.value }))}
                  placeholder="1-year workmanship warranty on all labor"
                />
              </div>
              <div className="col-span-2">
                <Label>Default payment terms</Label>
                <Input
                  value={pricing.payment_terms}
                  onChange={(e) => setPricing((p) => ({ ...p, payment_terms: e.target.value }))}
                  placeholder="50% deposit, 50% on completion"
                />
              </div>
            </div>
          </Card>

          {/* Live preview */}
          <Card className="p-6 bg-muted/20 space-y-3">
            <h2 className="font-display font-semibold text-lg">Live Pricing Preview</h2>
            <p className="text-sm text-muted-foreground">
              Example: a roofing job with $8,000 in materials and 40 labor hours using your <strong>Roofing</strong> rates.
            </p>
            {(() => {
              const t = pricing.trades.roofing || pricing.trades.default;
              const materials = 8000;
              const hours = 40;
              const materialCost = materials * (1 + t.material_markup / 100);
              const laborCost = hours * t.labor_rate;
              const subtotal = materialCost + laborCost;
              const withOverhead = subtotal * (1 + t.overhead / 100);
              const goodPrice = withOverhead * (1 + t.profit_margin / 100);
              const betterPrice = goodPrice * (1 + pricing.tier_spread.better / 100);
              const bestPrice = goodPrice * (1 + pricing.tier_spread.best / 100);
              const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              return (
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Good</p>
                    <p className="text-2xl font-bold text-foreground">{fmt(goodPrice)}</p>
                  </div>
                  <div className="rounded-lg border border-primary p-4 text-center bg-primary/5">
                    <p className="text-xs text-primary uppercase tracking-wide mb-1">Better ★</p>
                    <p className="text-2xl font-bold text-primary">{fmt(betterPrice)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Best</p>
                    <p className="text-2xl font-bold text-foreground">{fmt(bestPrice)}</p>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {activeTab === "integrations" && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Integrations</h2>

          <div>
            <Label>GoHighLevel workflow webhook URL</Label>
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground mt-1">
              Use this URL in your GoHighLevel workflow webhook action after the voice agent captures a lead.{" "}
              <a href="/ghl-setup" className="underline text-foreground">Full GoHighLevel setup guide →</a>
            </p>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div>
              <h3 className="font-display font-semibold">Contractor-owned GoHighLevel</h3>
              <p className="text-sm text-muted-foreground">
                Optional. Add the contractor's own GHL Private Integration Token and location details so proposal contacts, emails, and SMS are created in that contractor's sub-account.
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
                Send contractor status notifications by SMS. Leave off for email-only notifications.
              </span>
            </label>
          </div>
        </Card>
      )}

      <Button onClick={save} disabled={saving} size="lg" className="shadow-glow">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
