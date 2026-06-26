import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Settings, LogOut, HardHat, ShieldCheck, Kanban } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = import.meta.env.VITE_ADMIN_EMAILS ?? "";
  if (!raw.trim()) return true; // no allowlist configured → allow all (dev fallback)
  const admins = raw.split(",").map((e: string) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const email = data.session.user.email;
    if (!isAdminEmail(email)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pipeline", label: "Pipeline", icon: Kanban },
    { to: "/contractor-search", label: "Find Contractors", icon: HardHat },
    { to: "/contractor-verification", label: "Verify Credentials", icon: ShieldCheck },
    { to: "/proposals/new", label: "New Proposal", icon: FileText },
    { to: "/settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col">
        <Link to="/dashboard" className="flex items-center gap-2 p-5 border-b border-border">
          <JobbidderLogo size="sm" />
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-accent/50 transition"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground truncate px-2 pb-2">{email}</div>
          <button onClick={signOut} className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
