import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({ meta: [{ title: "Unsubscribe" }] }),
});

function UnsubscribePage() {
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { setState("invalid"); return; }
    setToken(t);
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) return setState("invalid");
        if (j.valid) setState("valid");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  async function confirm() {
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.success) setState("done");
      else if (j.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <h1 className="font-display text-2xl font-bold mb-3">Unsubscribe</h1>
        {state === "loading" && <p className="text-muted-foreground">Checking your link…</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">Click the button below to stop receiving emails from Jobbidder.</p>
            <Button onClick={confirm} disabled={submitting} size="lg">
              {submitting ? "Working…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}
        {state === "done" && <p className="text-green-400">You've been unsubscribed. We won't email you again.</p>}
        {state === "already" && <p className="text-muted-foreground">You're already unsubscribed.</p>}
        {state === "invalid" && <p className="text-destructive">This link is invalid or expired.</p>}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again later.</p>}
      </Card>
    </div>
  );
}