import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

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
    tagline: "Learn the system. Zero risk.",
    price: "$0",
    period: "/mo",
    description: "For contractors trying Jobbidder for the first time.",
    features: [
      "1 proposal trial",
      "AI-generated scope & labor",
      "Good / Better / Best tiers",
      "Public share link",
    ],
    cta: "Start as Apprentice",
    href: "/login",
    highlighted: false,
    external: false,
  },
  {
    name: "Journeyman",
    tagline: "Full power. No limits. Pays for itself on your first job.",
    price: "$297",
    period: "/mo",
    description: "For contractors closing 3+ jobs per month.",
    features: [
      "Unlimited proposals",
      "Full materials catalog",
      "SMS & email delivery",
      "Wholesale pricing access",
      "Client e-signatures",
    ],
    cta: "Become a Journeyman",
    href: "https://link.suddenimpactagency.io/payment-link/6a1b2d8903b17c94f5713b58",
    highlighted: true,
    external: true,
  },
  {
    name: "Master GC",
    tagline: "Run your empire. White label included.",
    price: "$497",
    period: "/mo",
    description: "For agencies and multi-contractor operations.",
    features: [
      "Everything in Journeyman",
      "White-label branding",
      "Unlimited contractors",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Go Master GC",
    href: "https://link.suddenimpactagency.io/payment-link/6a1b2f2703b17c94f5713b5b",
    highlighted: false,
    external: true,
  },
  {
    name: "Principal",
    tagline: "Own it forever. The last tool you will ever buy.",
    price: "$6,500",
    period: "one-time",
    description: "For contractors who own their operation and never want to pay a monthly fee again. One payment. Lifetime access. You are the Principal.",
    features: [
      "Everything in Master GC",
      "Lifetime access — no monthly fees",
      "All future updates included",
      "Priority white-glove onboarding",
      "Direct line to the build team",
    ],
    cta: "Become a Principal",
    href: "https://link.suddenimpactagency.io/payment-link/6a1b2f6771d2406ac8cf9eb4",
    highlighted: false,
    external: true,
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-gradient-sia">Jobbidder</span>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
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
                  Pays for itself on your first job through wholesale materials savings
                </p>
              )}
            </div>
          ))}
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
