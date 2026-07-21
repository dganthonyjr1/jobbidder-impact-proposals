import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Lock } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { JessicaWebCallWidget } from "@/components/JessicaWebCallWidget";
import { GuideBody } from "@/components/GuideContent";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Jobbidder Works — Step by Step" },
      { name: "description", content: "Exactly how Jobbidder turns a job description or an architect's spec into an accurate, itemized, client-ready proposal in about a minute — and why every estimate is grounded in real numbers, not AI guesses." },
      { property: "og:title", content: "How Jobbidder Works — Step by Step" },
      { property: "og:description", content: "AI intake, spec reading, catalog-grounded pricing, scope checks, e-sign and deposits — the whole pipeline explained plainly." },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JessicaWebCallWidget floating />

      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/"><JobbidderLogo size="sm" /></Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/how-it-works" className="text-sm font-semibold text-foreground transition">How it works</Link>
            <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline">Why Jobbidder</Link>
            <Button asChild size="sm"><Link to="/login">Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground mb-5">
          <Sparkles className="h-3.5 w-3.5" /> The whole pipeline, explained plainly
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
          How Jobbidder turns a job into a winning proposal
        </h1>
        <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">
          From the moment a lead calls to the signed deposit, here's exactly what happens, how each part works,
          and why it's built this way — grounded in real numbers, not AI guesses.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Button asChild size="lg" className="shadow-glow"><Link to="/login">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/pricing">See pricing</Link></Button>
        </div>
      </section>

      {/* Shared guide body */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <GuideBody />
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card p-10">
          <Lock className="h-8 w-8 mx-auto text-primary" />
          <h2 className="font-display text-3xl font-bold tracking-tight mt-4">Your pricing. Your data. Your proposals.</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Set it up in an afternoon and send your first grounded, itemized, client-ready proposal today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-7">
            <Button asChild size="lg" className="shadow-glow"><Link to="/login">Get started now <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/pricing">View pricing plans</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <JobbidderLogo size="sm" />
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/how-it-works" className="hover:text-foreground transition">How it works</Link>
            <Link to="/pricing" className="hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="hover:text-foreground transition">Why Jobbidder</Link>
            <Link to="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
