import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Settings, LogOut, ShieldCheck, Kanban, Share2, CreditCard, ImagePlus, BookOpen, Menu, X } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { to: "/contractor-verification", label: "Verify Credentials", icon: ShieldCheck },
    { to: "/proposals/new", label: "New Proposal", icon: FileText },
    { to: "/media-upload", label: "Media", icon: ImagePlus },
    { to: "/affiliate", label: "Affiliate", icon: Share2 },
    { to: "/account", label: "Billing", icon: CreditCard },
    { to: "/settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-sidebar px-4">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-1 -ml-1 text-sidebar-foreground">
          <Menu className="h-6 w-6" />
        </button>
        <Link to="/dashboard" className="flex items-center">
          <JobbidderLogo size="sm" />
        </Link>
      </div>

      {/* Backdrop (mobile only, when drawer open) */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — slide-in drawer on mobile, static on desktop */}
      <aside
        className={`bg-sidebar border-r border-border flex flex-col
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:z-auto md:w-60 md:translate-x-0`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <JobbidderLogo size="md" />
          </Link>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="md:hidden p-1 text-muted-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-base text-sidebar-foreground hover:bg-accent/50 transition"
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Link
            to="/guide"
            onClick={() => setMobileOpen(false)}
            activeProps={{ className: "text-foreground" }}
            className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition"
          >
            <BookOpen className="h-4 w-4" /> Guide &amp; help
          </Link>
          <div className="text-sm text-muted-foreground truncate px-2 py-2">{email}</div>
          <button onClick={signOut} className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-base text-muted-foreground hover:bg-accent/50 transition">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
