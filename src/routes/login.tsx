import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Jobbidder" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    error: typeof s.error === "string" ? s.error : "",
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { error: urlError } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleForgot() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then click Forgot password.");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent. Check your email.");
    } catch (err: any) {
      toast.error(err?.message || "Could not send reset email");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { business_name: businessName || "My Contracting Co" },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
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
          <h1 className="font-display text-2xl font-semibold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to your dashboard." : "Start sending proposals in minutes."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="business">Business name</Label>
                <Input id="business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Contracting" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgot}
              disabled={forgotLoading}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              {forgotLoading ? "Sending…" : "Forgot password?"}
            </button>
          )}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  );
}
