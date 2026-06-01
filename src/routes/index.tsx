import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Sparkles, ShieldCheck, ArrowRight, Languages } from "lucide-react";
import { VoiceCallButton } from "@/components/VoiceCallButton";

const SIA_LOGO = "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/S1DwV6RpRVZL2ZtYEo16/media/689ba94c7b7578a4c3bbeead.jpeg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bidpilot AI Proposals That Close" },
      { name: "description", content: "AI proposal and estimate platform for contractors. Voice call to signed contract in minutes." },
      { property: "og:title", content: "Bidpilot" },
      { property: "og:description", content: "AI proposal and estimate platform for contractors." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-gradient-sia">Bidpilot</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Pricing</Link>
            <Link to="/why-bidpilot" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Why Bidpilot</Link>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Sign in</Link>
            <Button asChild size="sm"><Link to="/login">Get started</Link></Button>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-24 pb-16 sm:pb-32 bg-grid">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-semibold text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="hidden sm:inline">A Sudden Impact Agency product built for contractors</span>
            <span className="sm:hidden">A Sudden Impact Agency product</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05]">
            From voice call to <span className="text-gradient-sia">signed proposal</span> in 60 seconds.
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl font-medium text-muted-foreground max-w-2xl">
            Bidpilot turns your AI intake calls into professional Good, Better, Best proposals with itemized materials, labor, and one click client acceptance, in English, Spanish, French, Portuguese, and Haitian Creole.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["English", "Español", "Français", "Português", "Kreyòl Ayisyen"].map((lang) => (
              <span key={lang} className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {lang}
              </span>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
            <VoiceCallButton />
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/login">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 sm:mt-24 grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: Languages, title: "Speaks your customer's language", body: "Intake calls and proposals auto localize to 5 languages. Win bids competitors can't even quote." },
            { icon: FileText, title: "AI generated proposals", body: "Claude grade copy, scope, materials and labor estimated automatically." },
            { icon: DollarSign, title: "Good, Better, Best", body: "Three tiers, one click for clients. Built in Sudden Impact Agency wholesale pricing." },
            { icon: ShieldCheck, title: "Sign and send", body: "Public link, e signature, materials order, all wired in." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display font-bold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>© {new Date().getFullYear()} Bidpilot · A product of{" "}
            <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-primary transition">
              Sudden Impact Agency
            </a>
          </span>
          <span className="hidden sm:inline">·</span>
          <Link to="/terms" className="hover:text-foreground transition">Terms</Link>
          <span className="hidden sm:inline">·</span>
          <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
