import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Sparkles, ShieldCheck, ArrowRight, Languages, HardHat, PhoneCall, BookOpen } from "lucide-react";
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2 sm:py-0 flex flex-wrap items-center justify-between gap-y-2">
          <Link to="/"><JobbidderLogo size="sm" className="!h-[29px] sm:!h-[38px]" /></Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline">How it works</Link>
            <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Why Jobbidder</Link>
            <Link to="/contractor-apply" search={{ phone: "", email: "", name: "", ghl_id: "" }} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline">For Contractors</Link>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline">Sign in</Link>
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
            { icon: FileText, title: "AI generated proposals", body: "Jobbidder AI-grade copy, scope, materials and labor estimated automatically." },
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

      {/* How it works — condensed, links to the full walkthrough */}
      <section className="border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">How Jobbidder works</h2>
            <p className="mt-3 text-muted-foreground">
              From the first call to a signed deposit — accurate, itemized proposals grounded in real numbers, not AI guesses.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: PhoneCall, step: "1", title: "A lead comes in", body: "AI intake answers, qualifies the caller, and captures every job 24/7 — nothing lost to voicemail." },
              { icon: FileText, step: "2", title: "Proposal in ~60 seconds", body: "Paste the scope or upload the architect's spec; get an itemized Good/Better/Best proposal." },
              { icon: BookOpen, step: "3", title: "Priced from real costs", body: "Your cost catalog grounds pricing in real unit costs, with a scope check so nothing gets left off." },
              { icon: ShieldCheck, step: "4", title: "Sign & collect deposit", body: "The client picks a tier, e-signs, and pays the deposit right on the proposal link." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">STEP {s.step}</span>
                </div>
                <h3 className="mt-4 font-display font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm font-medium text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">See the full walkthrough <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <Link
              to="/contractor-apply"
              search={{ phone: "", email: "", name: "", ghl_id: "" }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-6 hover:bg-primary/20 transition"
            >
              <HardHat className="h-3 w-3" />
              Now accepting licensed contractors
            </Link>
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
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="shadow-glow w-full sm:w-auto">
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
