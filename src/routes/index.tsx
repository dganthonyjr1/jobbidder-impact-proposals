import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Sparkles, ShieldCheck, ArrowRight, Languages, HardHat, Phone } from "lucide-react";
import { JessicaWebCallWidget } from "@/components/JessicaWebCallWidget";
import { JobbidderLogo } from "@/components/JobbidderLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jobbidder AI Proposals That Close" },
      { name: "description", content: "AI proposal and estimate platform for contractors. Voice call to signed contract in minutes." },
      { property: "og:title", content: "Jobbidder" },
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
          <Link to="/"><JobbidderLogo size="sm" /></Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Why Jobbidder</Link>
            <Link to="/contractor-apply" search={{ phone: "", email: "", name: "", ghl_id: "" }} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline">For Contractors</Link>
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
            Jobbidder turns your AI intake calls into professional Good, Better, Best proposals with itemized materials, labor, and one click client acceptance, in English, Spanish, French, Portuguese, and Haitian Creole.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["English", "Español", "Français", "Português", "Kreyòl Ayisyen"].map((lang) => (
              <span key={lang} className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {lang}
              </span>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
            <JessicaWebCallWidget />
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

      <section className="border-t border-border/40 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-6">
              <HardHat className="h-3 w-3" />
              Now accepting licensed contractors
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
              Are you a <span className="text-gradient-sia">licensed contractor</span>?
            </h2>
            <p className="mt-5 text-base sm:text-lg font-medium text-muted-foreground max-w-xl mx-auto">
              Join the Jobbidder contractor network. Our AI qualifies jobs, generates proposals, and delivers signed contracts to your inbox — no chasing leads, no paperwork.
            </p>
            <div className="mt-4 grid sm:grid-cols-3 gap-4 text-left max-w-xl mx-auto">
              {[
                { icon: ShieldCheck, text: "License & insurance verified" },
                { icon: DollarSign, text: "Transparent, wholesale pricing" },
                { icon: FileText, text: "Contracts ready to sign" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  {item.text}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="shadow-glow w-full sm:w-auto">
                <a href="tel:+13109874997">
                  <Phone className="mr-2 h-4 w-4" />
                  Call to apply: (310) 987-4997
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/contractor-apply" search={{ phone: "", email: "", name: "", ghl_id: "" }}>Apply online <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Licensed and insured contractors only · Contractor's license &amp; COI required
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70 max-w-md mx-auto">
              By calling or applying you agree to receive automated SMS and AI-assisted voice calls from Jobbidder
              (Sudden Impact Agency LLC). Consent is not required to receive services. Msg &amp; data rates may apply.
              Reply STOP to opt out.{" "}
              <Link to="/sms-terms" className="underline hover:text-muted-foreground">SMS Terms</Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>© {new Date().getFullYear()} Jobbidder · A product of{" "}
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
