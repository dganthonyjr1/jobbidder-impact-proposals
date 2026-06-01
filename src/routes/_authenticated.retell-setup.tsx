import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/retell-setup")({
  head: () => ({ meta: [{ title: "Retell setup — Bidpilot" }] }),
  component: RetellSetup,
});

function RetellSetup() {
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("contractors").select("id").eq("user_id", user.id).single();
      if (data?.id) {
        setContractorId(data.id);
        setWebhookUrl(`${window.location.origin}/api/public/webhook/retell?contractor=${data.id}`);
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
          event: "call_analyzed",
          call: {
            transcript: "Customer wants a kitchen backsplash installed, about 30 sq ft of subway tile.",
            from_number: "+15551234567",
            call_analysis: {
              custom_analysis_data: {
                document_type: "proposal",
                caller_name: "Test Caller",
                email: "test@example.com",
                phone: "+15551234567",
                job_address: "123 Test St",
                job_state: "NJ",
                trade_type: "tile",
                job_description: "Install 30 sq ft of white subway tile backsplash in kitchen, including grout and edge trim.",
              },
            },
          },
        }),
      });
      const json = await res.json();
      setTestResult({ ok: res.ok, body: json });
      if (res.ok) toast.success("Test call processed — check your dashboard");
      else toast.error(`Test failed (${res.status})`);
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
      setTestResult({ ok: false, error: e?.message });
    } finally {
      setTesting(false);
    }
  }

  const agentPrompt = `You are the AI receptionist for {{business_name}}, a contractor. Your job is to qualify the caller, capture the project details, and offer them either a quick ballpark estimate or a full itemized proposal.

Greet warmly, then ask:
1. Their full name
2. Best email and phone number
3. Job address (street, city, state — 2-letter abbreviation)
4. What trade/work they need (roofing, tile, plumbing, etc.)
5. Detailed description of the job (size, materials, conditions)
6. Whether they want a quick ballpark estimate (faster) or a full itemized proposal with tiers (more detailed)

Confirm details back to them. Be friendly, concise, and never quote prices yourself — the system will generate the document after the call.`;

  const variablesJson = JSON.stringify({
    caller_name: "string — caller's full name",
    email: "string — caller's email",
    phone: "string — caller's phone (E.164 preferred)",
    job_address: "string — street address",
    job_city: "string — city",
    job_state: "string — 2-letter state code (NJ, CA, etc.)",
    trade_type: "string — trade (roofing, tile, electrical, etc.)",
    job_description: "string — detailed scope of work",
    job_scope: "string — extra scope notes (optional)",
    document_type: "enum: 'estimate' (ballpark) or 'proposal' (full itemized)",
    language: "enum: 'en' | 'es' | 'fr' | 'pt' | 'ht' — language Alex detected the caller speaking. Drives proposal copy + GHL/Michelle SMS+email locale.",
  }, null, 2);

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">Retell setup</h1>
          <Badge variant="secondary">5 min</Badge>
        </div>
        <p className="text-muted-foreground mt-1">Wire your Retell voice agent to Bidpilot so every inbound call becomes a proposal or estimate.</p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-display font-semibold text-lg">Step 1 · Webhook URL</h2>
        <p className="text-sm text-muted-foreground">In Retell → your agent → <strong>Webhook</strong> → paste this URL as the post-call webhook (event: <code>call_analyzed</code>).</p>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={() => copy(webhookUrl, "webhook URL")}><Copy className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground">The <code>?contractor=…</code> param routes the call to your account. Don't remove it.</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display font-semibold text-lg">Step 2 · Agent prompt</h2>
        <p className="text-sm text-muted-foreground">Paste this into Retell → <strong>General Prompt</strong> (tweak the greeting for your brand).</p>
        <div className="relative">
          <pre className="text-xs bg-muted/40 rounded-md p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-auto">{agentPrompt}</pre>
          <Button variant="outline" size="icon" className="absolute top-2 right-2" onClick={() => copy(agentPrompt, "prompt")}><Copy className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display font-semibold text-lg">Step 3 · Post-call analysis variables</h2>
        <p className="text-sm text-muted-foreground">In Retell → <strong>Post-Call Analysis</strong> → add these fields under "Custom Analysis Data". Bidpilot reads them to build the proposal.</p>
        <div className="relative">
          <pre className="text-xs bg-muted/40 rounded-md p-4 whitespace-pre-wrap font-mono leading-relaxed">{variablesJson}</pre>
          <Button variant="outline" size="icon" className="absolute top-2 right-2" onClick={() => copy(variablesJson, "variables")}><Copy className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground">All fields are optional — missing ones fall back to transcript parsing.</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display font-semibold text-lg">Step 4 · Test the flow</h2>
        <p className="text-sm text-muted-foreground">Fires a fake <code>call_analyzed</code> event with a sample tile job. A new proposal should appear on your dashboard.</p>
        <Button onClick={runTest} disabled={testing || !contractorId} className="shadow-glow">
          {testing ? "Running test…" : "Send test event"}
        </Button>
        {testResult && (
          <pre className="text-xs bg-muted/40 rounded-md p-3 mt-2 overflow-auto max-h-64">{JSON.stringify(testResult, null, 2)}</pre>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-display font-semibold text-lg mb-2">Production checklist</h2>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>✓ Webhook URL pasted into Retell agent</li>
          <li>✓ Agent prompt deployed (test in Retell's playground)</li>
          <li>✓ Custom analysis fields configured</li>
          <li>✓ Test event returns <code>ok: true</code> + proposal appears on dashboard</li>
          <li>✓ Make one real test call to your Retell phone number</li>
          <li>✓ Confirm SMS / email arrives at the test caller</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-4">
          Need help with Retell's UI? <a href="https://docs.retellai.com" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Retell docs <ExternalLink className="h-3 w-3" /></a>
        </p>
      </Card>
    </div>
  );
}