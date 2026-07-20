import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Building2, Phone, ShieldCheck, Kanban, Zap, PackagePlus, ImagePlus } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { JessicaWebCallWidget } from "@/components/JessicaWebCallWidget";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Jobbidder" },
      { name: "description", content: "Simple, transparent pricing for AI-powered contractor proposals." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Apprentice",
    tagline: "See what the system can do. Zero risk.",
    price: "$0",
    period: "/mo",
    setup: null,
    description: "One complete AI experience — end to end. No credit card, no commitment. Just proof.",
    features: [
      "1 full AI intake call (up to 15 min)",
      "1 AI-generated proposal",
      "Good / Better / Best tiers",
      "SMS & email delivery",
      "Public share link",
    ],
    cta: "Start Free",
    href: "/login",
    highlighted: false,
    external: false,
  },
  {
    name: "Journeyman",
    tagline: "Full power. Pays for itself on your first job.",
    price: "$497",
    period: "/mo",
    setup: "$497",
    description: "For contractors closing jobs and done leaving money on the table.",
    features: [
      "Unlimited AI proposals",
      "Good / Better / Best tiers",
      "Full materials catalog",
      "Wholesale pricing access",
      "SMS & email delivery",
      "Client e-signatures",
    ],
    cta: "Become a Journeyman",
    href: "https://link.suddenimpactagency.io/payment-link/6a402a42390a6e280643af94",
    highlighted: true,
    external: true,
  },
  {
    name: "Master GC",
    tagline: "Run your operation under your brand.",
    price: "$997",
    period: "/mo",
    setup: "$997",
    description: "For agencies and multi-contractor operations that need full control.",
    features: [
      "Everything in Journeyman",
      "500 AI credits/mo included",
      "$0.50 per credit after 500",
      "AI voice prequal calls (up to 15 min)",
      "License & insurance verification",
      "White-label branding",
      "Unlimited contractors",
      "Team management dashboard",
      "Custom integrations",
    ],
    cta: "Go Master GC",
    href: "https://link.suddenimpactagency.io/payment-link/6a402ae09b12592b36824ddb",
    highlighted: false,
    external: true,
  },
  {
    name: "Principal",
    tagline: "The full platform. Nothing held back.",
    price: "$1,997",
    period: "/mo",
    setup: "$1,997",
    description: "For serious operations that demand the best tooling, fastest support, and every feature as it ships.",
    features: [
      "Everything in Master GC",
      "2,000 AI credits/mo included",
      "$0.50 per credit after 2,000",
      "Document renewal alerts",
      "Priority AI voice (enhanced model)",
      "All future features included",
      "Priority white-glove onboarding",
      "Dedicated support line",
      "SLA guarantee",
    ],
    cta: "Become a Principal",
    href: "https://link.suddenimpactagency.io/payment-link/6a402b3a9b12592b36824ddd",
    highlighted: false,
    external: true,
  },
];

const enterpriseFeatures = [
  { icon: ImagePlus, label: "AI-powered photo & video library", detail: "Auto-tag, enhance, and organize job site media by proposal or contractor" },
  { icon: Phone, label: "Automated voice pre-qualification", detail: "AI calls prospects up to 15 min, qualifies them, routes to pipeline" },
  { icon: ShieldCheck, label: "License & insurance verification", detail: "AI extracts and validates credentials from uploaded documents" },
  { icon: Kanban, label: "Kanban pipeline CRM", detail: "Replace HubSpot — full deal + contractor pipeline in one view" },
  { icon: Zap, label: "Document renewal alerts", detail: "Auto-notify contractors before licenses or insurance expires" },
  { icon: Building2, label: "CRM & automation integration", detail: "Two-way sync with your CRM, workflows, and SMS sequences" },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background bg-hero">
      <JessicaWebCallWidget floating />
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <JobbidderLogo size="sm" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing" className="text-sm font-semibold text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Why Jobbidder</Link>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Sign in</Link>
            <Button asChild size="sm"><Link to="/login">Get started</Link></Button>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-semibold text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Simple pricing, no surprises</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
            Choose your plan
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground font-medium">
            Start free. Scale when you&apos;re ready. Every paid tier pays for itself on your first job.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                "relative rounded-2xl border p-6 sm:p-8 flex flex-col " +
                (tier.highlighted
                  ? "border-primary/60 bg-card shadow-glow"
                  : "border-border bg-card/60 shadow-card")
              }
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="font-display text-xl font-bold">{tier.name}</h3>
              <p className="mt-1 text-sm font-semibold text-primary">{tier.tagline}</p>
              <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">{tier.price}</span>
                <span className="text-muted-foreground font-medium">{tier.period}</span>
              </div>
              {tier.setup && (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  + {tier.setup} one-time setup fee · 14-day money-back guarantee
                </p>
              )}
              <ul className="mt-6 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={tier.highlighted ? "default" : "outline"}
                size="lg"
                className="mt-8 w-full"
              >
                {tier.external ? (
                  <a href={tier.href} target="_blank" rel="noreferrer">{tier.cta}</a>
                ) : (
                  <Link to={tier.href}>{tier.cta}</Link>
                )}
              </Button>
              {tier.price !== "$0" && (
                <p className="mt-3 text-center text-xs text-muted-foreground font-medium">
                  Most users recover the setup fee on their first job
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pay-as-you-go Proposal Pack ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-primary/40 bg-card/70 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground mb-3">
              <PackagePlus className="h-3 w-3 text-primary" />
              Pay as you go
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight">Proposal Pack</h3>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Not ready for a monthly plan? Get <strong className="text-foreground">3 AI proposals for $75</strong> — full Good / Better / Best, SMS &amp; email delivery, and a public share link.{" "}
              <strong className="text-foreground">They never expire.</strong> Yours to use whenever the work comes in.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-center gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tracking-tight">$75</span>
              <span className="text-muted-foreground font-medium">/ 3 proposals</span>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href="https://link.suddenimpactagency.io/payment-link/6a4a6a9ea655fa0b802a2c2b" target="_blank" rel="noreferrer">Buy a Pack</a>
            </Button>
            <p className="text-xs text-muted-foreground">$25 / proposal · upgrade to unlimited anytime</p>
          </div>
        </div>
      </section>

      {/* ── Credit Breakdown ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-6">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">How AI credits work</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                One credit = one AI action. Your monthly allotment is included in the plan price.
                Once you exceed your allotment, usage continues automatically at <strong className="text-foreground">$0.50 per credit</strong> — billed at the end of each cycle.
                Credits refresh every billing cycle and unused credits do not roll over.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { action: "AI voice prequal call", cost: "1 credit", detail: "Up to 15 minutes per call" },
              { action: "AI document extraction", cost: "1 credit", detail: "License, insurance, workers comp, surety bond" },
              { action: "AI proposal generation", cost: "1 credit", detail: "Full Good / Better / Best proposal" },
              { action: "Automated SMS sequence", cost: "1 credit", detail: "Full multi-touch recruitment sequence" },
              { action: "Contractor verification report", cost: "1 credit", detail: "Compiled compliance summary" },
              { action: "Document renewal alert", cost: "1 credit", detail: "Auto-triggered 30/60/90 days before expiry" },
            ].map((row) => (
              <div key={row.action} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{row.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{row.cost}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            One complete contractor onboarding (outreach → prequal call → document verification → placement) uses approximately 5 credits.
            Master GC (500 credits) supports ~100 onboardings/mo. Principal (2,000) supports ~400. Enterprise (10,000) supports ~2,000.
            Need more? Usage continues automatically at $0.50/credit — no interruptions, no manual top-ups.
          </p>
        </div>
      </section>

      {/* ── Credit Add-On Packs ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-6">
            <PackagePlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Credit add-on packs</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Need more credits mid-cycle? Buy in bulk and save versus the $0.50/credit overage rate.
                Packs never expire, stack on top of your monthly allotment, and are consumed before overage kicks in.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                name: "Starter Pack",
                credits: "1,000 credits",
                price: "$99",
                perCredit: "$0.099 / credit",
                saving: "Save 80% vs. overage",
                detail: "~200 contractor onboardings",
                href: "https://link.suddenimpactagency.io/payment-link/6a402e329b12592b36824de5",
              },
              {
                name: "Growth Pack",
                credits: "5,000 credits",
                price: "$399",
                perCredit: "$0.080 / credit",
                saving: "Save 84% vs. overage",
                detail: "~1,000 contractor onboardings",
                popular: true,
                href: "https://link.suddenimpactagency.io/payment-link/6a402edd9b12592b36824de6",
              },
              {
                name: "Scale Pack",
                credits: "15,000 credits",
                price: "$999",
                perCredit: "$0.067 / credit",
                saving: "Save 87% vs. overage",
                detail: "~3,000 contractor onboardings",
                href: "https://link.suddenimpactagency.io/payment-link/6a402fb79b12592b36824de9",
              },
            ].map((pack) => (
              <div
                key={pack.name}
                className={
                  "relative rounded-xl border p-5 flex flex-col gap-3 " +
                  (pack.popular
                    ? "border-primary/60 bg-card shadow-glow"
                    : "border-border bg-background/60")
                }
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground whitespace-nowrap">
                      Best Value
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{pack.name}</p>
                  <p className="text-2xl font-display font-bold tracking-tight mt-1">{pack.price}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pack.credits}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary">{pack.saving}</p>
                  <p className="text-xs text-muted-foreground">{pack.perCredit}</p>
                  <p className="text-xs text-muted-foreground">{pack.detail}</p>
                </div>
                <Button asChild variant={pack.popular ? "default" : "outline"} size="sm" className="mt-auto w-full">
                  <a href={pack.href} target="_blank" rel="noreferrer">
                    Buy Pack
                  </a>
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Packs are available on any paid plan. Credits are consumed in order: monthly allotment first, then pack credits, then overage at $0.50/credit.
            Add-on credits do not expire and carry over month to month.
          </p>
        </div>
      </section>

      {/* ── Enterprise Tier ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12 overflow-hidden shadow-glow">
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-start">
            {/* Left: Pitch */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-4">
                <Building2 className="h-3 w-3" />
                Enterprise — Contractor Network
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">
                Replace NetSuite + HubSpot.<br />
                <span className="text-gradient-sia">One platform. Built for contractors.</span>
              </h2>
              <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
                Purpose-built for staffing agencies, national contractors, and enterprise operations managing large contractor networks. Everything in Master GC plus the full contractor recruitment and verification stack — live in days, not months.
              </p>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold tracking-tight">$3,500</span>
                <span className="text-muted-foreground font-medium text-lg">/mo</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                + $3,500 one-time setup fee · 14-day money-back guarantee · 10,000 AI credits/mo included · $0.50/credit after
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                vs. $3,299+/mo for NetSuite + HubSpot combined — with none of the contractor-specific capabilities.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="font-bold">
                  <a href="https://link.suddenimpactagency.io/payment-link/6a402be19b12592b36824ddf" target="_blank" rel="noreferrer">Get Started</a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="mailto:don@suddenimpactagency.io?subject=Enterprise%20Plan%20Inquiry">Book a Demo</a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Custom onboarding included · Dedicated account manager · Cancel anytime</p>
            </div>

            {/* Right: Feature list */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">What's included beyond Master GC</p>
              {enterpriseFeatures.map((f) => (
                <div key={f.label} className="flex items-start gap-4 rounded-xl border border-border bg-background/60 p-4">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Jobbidder · A product of{" "}
        <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-primary transition">
          Sudden Impact Agency
        </a>
      </footer>
    </div>
  );
}
