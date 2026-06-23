import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { JobbidderLogo } from "@/components/JobbidderLogo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Jobbidder" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places a recovery token in the URL hash (#access_token=…&type=recovery).
    // Calling getSession picks it up and signs the user into a temporary recovery session.
    supabase.auth.getSession().then(({ data }) => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (data.session || hash.includes("type=recovery")) setReady(true);
      else setReady(true); // still show form; updateUser will surface a clear error if there is no session
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err?.message || "Could not update password. Try requesting a new reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background bg-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <JobbidderLogo />
          </Link>
        </div>
        <Card className="p-8 bg-card border-border shadow-card">
          <h1 className="font-display text-2xl font-semibold mb-1">Set a new password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the new password for your account.
          </p>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw2">Confirm password</Label>
                <Input id="pw2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
          <Link to="/login" className="mt-6 text-sm text-muted-foreground hover:text-foreground w-full text-center block">
            Back to sign in
          </Link>
        </Card>
      </div>
    </div>
  );
}
