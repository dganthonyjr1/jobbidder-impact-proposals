import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ghl-setup")({
  head: () => ({ meta: [{ title: "GoHighLevel setup — Jobbidder" }] }),
  component: GhlSetup,
});

function GhlSetup() {
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("contractors").select("id").eq("user_id", user.id).single();
      if (error) console.error("[ghl-setup] Contractor lookup failed:", error.message);
      if (data?.id) {
        setContractorId(data.id);
        setWebhookUrl(`${window.location.origin}/api/public/webhook/ghl?contractor=${data.id}`);
      }
    })();
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  async function runTest() {
    if (!contractorId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "Test Caller",
          email: "test@example.com",
          phone: "+15551234567",
          address1: "123 Test St",
          state: "NJ",
          custom_fields: {
            trade_type: "tile",
            job_description: "TEST ONLY: Install 30 sq ft of white subway tile backsplash in kitchen, including grout and edge trim.",
          },
          notify: false,
        }),
      });
      const json = await res.json();
      setTestResult({ ok: res.ok, body: json });
      if (res.ok) toast.success("GHL webhook test processed — check your dashboard");
      else toast.error(`Test failed (${res.status})`);
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
      setTestResult({ ok: false, error: e?.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">GoHighLevel setup</h1>
        <p className="text-muted-foreground mt-1">Connect your GHL voice agent, SMS, and email workflow to Jobbidder so captured leads can become proposal records automatically.</p>
      </div>

      <Card className="p-6 space-y-3">
        <Label>Jobbidder GHL webhook URL</Label>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button variant="outline" onClick={() => copy(webhookUrl, "webhook URL")}><Copy className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground">In GoHighLevel, add a workflow webhook action after your voice agent captures the caller's project details. Send standard fields such as name, email, phone, address, state, plus custom fields for trade_type and job_description.</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display text-xl font-semibold">Recommended GHL payload fields</h2>
        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">{`{
  "full_name": "Lead Name",
  "email": "lead@example.com",
  "phone": "+15551234567",
  "address1": "Project address",
  "state": "NJ",
  "custom_fields": {
    "trade_type": "roofing",
    "job_description": "Caller wants a roof replacement estimate..."
  }
}`}</pre>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display text-xl font-semibold">Test webhook</h2>
        <p className="text-sm text-muted-foreground">This sends a safe test payload with notifications disabled, so it validates proposal creation without sending SMS or email.</p>
        <Button onClick={runTest} disabled={testing || !webhookUrl}>{testing ? "Testing…" : "Run safe test"}</Button>
        {testResult && <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>}
      </Card>
    </div>
  );
}
