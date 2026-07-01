import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { Loader2, CheckCircle2, Clock, AlertTriangle, FileText, ShieldCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/contractor")({
  head: () => ({ meta: [{ title: "Contractor Portal — Jobbidder" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: ContractorPortalPage,
});

type Contractor = {
  name: string; email: string | null; phone: string | null;
  trade_type: string | null; service_area: string | null; license_number: string | null;
  license_url: string | null; insurance_url: string | null;
  status: string; qualification_status: string | null;
  qualification_score: number | null; qualification_percentage: number | null;
  created_at: string;
};
type Doc = { id: string; document_type: string; status: string; expiration_date: string | null; file_name: string | null };

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800 border-green-300",
  compliant: "bg-green-100 text-green-800 border-green-300",
  verified: "bg-green-100 text-green-800 border-green-300",
  submitted: "bg-blue-100 text-blue-800 border-blue-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  needs_review: "bg-amber-100 text-amber-800 border-amber-300",
  expired: "bg-red-100 text-red-800 border-red-300",
  invalid: "bg-red-100 text-red-800 border-red-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};
const pill = (s: string) =>
  `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s?.toLowerCase?.()] || "bg-muted text-muted-foreground border-border"}`;
const pretty = (s: string) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function ContractorPortalPage() {
  const { token } = Route.useSearch();
  if (token) return <PortalView token={token} />;
  return <LoginForm />;
}

function LoginForm() {
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/public/contractor-portal-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim() }),
      });
      await r.json().catch(() => ({}));
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-5">
        <div className="flex justify-center"><JobbidderLogo size="md" /></div>
        {sent ? (
          <div className="text-center space-y-3">
            <Mail className="h-10 w-10 mx-auto text-primary" />
            <h1 className="font-display text-xl font-semibold">Check your phone & email</h1>
            <p className="text-sm text-muted-foreground">
              If we found your application, a secure link is on its way to the email and phone on file. It expires in 7 days.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="font-display text-xl font-semibold">Contractor Portal</h1>
              <p className="text-sm text-muted-foreground">Enter the email or phone number from your application and we'll text/email you a secure link.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Email or phone</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com or (555) 000-0000" autoFocus />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : "Send me my link"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

function PortalView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ contractor: Contractor; documents: Doc[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/contractor-portal-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || "Could not load your portal.");
        setData({ contractor: j.contractor, documents: j.documents });
      } catch (e: any) {
        setError(e?.message || "Could not load your portal.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading your portal…</div>;
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <h1 className="font-display text-lg font-semibold">Link problem</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline"><a href="/contractor">Request a new link</a></Button>
        </Card>
      </div>
    );
  }

  const c = data.contractor;
  const qualified = ["approved", "compliant", "verified"].includes((c.qualification_status || c.status || "").toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <JobbidderLogo size="md" />
          <span className={pill(c.qualification_status || c.status)}>
            {qualified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {pretty(c.qualification_status || c.status)}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome, {(c.name || "").split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's the status of your contractor application with Jobbidder.</p>
        </div>

        {/* Qualification */}
        <Card className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Qualification</h2></div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Status: </span><span className={pill(c.qualification_status || c.status)}>{pretty(c.qualification_status || c.status)}</span></div>
            {c.qualification_score != null && (
              <div><span className="text-muted-foreground">Score: </span><span className="font-semibold">{c.qualification_score}/120{c.qualification_percentage != null ? ` (${Math.round(c.qualification_percentage)}%)` : ""}</span></div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {qualified
              ? "You're qualified. Our team will be in touch about next steps and available projects."
              : "Your application is being reviewed. Make sure your documents below are current — expired or missing documents slow this down."}
          </p>
        </Card>

        {/* Profile */}
        <Card className="p-5 sm:p-6 space-y-3">
          <h2 className="font-semibold">Your details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Detail label="Name" value={c.name} />
            <Detail label="Trade" value={c.trade_type} />
            <Detail label="Email" value={c.email} />
            <Detail label="Phone" value={c.phone} />
            <Detail label="Service area" value={c.service_area} />
            <Detail label="License #" value={c.license_number} />
          </div>
        </Card>

        {/* Documents */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">Documents</h2></div>
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on file yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.documents.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{pretty(d.document_type)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.file_name || "—"}
                      {d.expiration_date ? ` · expires ${new Date(d.expiration_date).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <span className={pill(d.status)}>{pretty(d.status)}</span>
                </div>
              ))}
            </div>
          )}
          <Button asChild variant="outline" className="w-full"><a href="/contractor-apply">Upload / update documents</a></Button>
        </Card>
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-words">{value || "—"}</div>
    </div>
  );
}
