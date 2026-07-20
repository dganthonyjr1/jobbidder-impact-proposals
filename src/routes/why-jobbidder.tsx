import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Phone, FileText, Clock, Zap, ArrowRight, TrendingDown, Shield, Mail, MessageSquare, Palette } from "lucide-react";
import { JobbidderLogo } from "@/components/JobbidderLogo";
import { JessicaWebCallWidget } from "@/components/JessicaWebCallWidget";

export const Route = createFileRoute("/why-jobbidder")({
  head: () => ({
    meta: [
      { title: "Why Jobbidder — The Only Contractor Tool That Pays You" },
      { name: "description", content: "See why Jobbidder destroys Jobber, ServiceTitan, Housecall Pro, and every other contractor tool. AI voice intake, proposals in 60 seconds, wholesale materials savings." },
      { property: "og:title", content: "Why Jobbidder — The Only Contractor Tool That Pays You" },
      { property: "og:description", content: "AI voice intake, proposals in 60 seconds, wholesale materials savings. See the comparison." },
    ],
  }),
  component: WhyJobbidderPage,
});

const competitors = [
  {
    name: "NetSuite",
    price: "$2,499+/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "6–12 months",
  },
  {
    name: "HubSpot",
    price: "$800+/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Months of config",
  },
  {
    name: "ServiceTitan",
    price: "$500/mo per tech",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Months to set up",
  },
  {
    name: "Jobber",
    price: "$300/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Manual estimates",
  },
  {
    name: "Spreadsheets",
    price: "Free",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: true,
    setup: "130 hours a year",
  },
];

const jobbidderFeatures = [
  { label: "AI voice intake", icon: Phone },
  { label: "Proposal in 60 seconds", icon: Zap },
  { label: "Wholesale materials savings", icon: TrendingDown },
  { label: "Good Better Best tiers", icon: FileText },
  { label: "Digital signature", icon: Shield },
  { label: "SMS & email delivery", icon: MessageSquare },
  { label: "You own your data", icon: Shield },
  { label: "White-label branding", icon: Palette },
];

/* ── SVG Bar Chart: 3-year total cost ── */
function CostChart() {
  const data = [
    { label: "NetSuite", value: 89964, color: "#dc2626" },
    { label: "HubSpot", value: 28800, color: "#ef4444" },
    { label: "ServiceTitan", value: 18000, color: "#f97316" },
    { label: "Jobber", value: 10800, color: "#eab308" },
    { label: "Housecall Pro", value: 11844, color: "#84cc16" },
  ];
  const max = 100000;
  const w = 640;
  const h = 320;
  const pad = { top: 24, right: 24, bottom: 64, left: 80 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barW = chartW / data.length * 0.65;
  const gap = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="3-year cost comparison chart">
      {/* Y-axis grid lines */}
      {[0, 25000, 50000, 75000, 100000].map((tick) => {
        const y = pad.top + chartH - (tick / max) * chartH;
        return (
          <g key={tick}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="11" fontFamily="Inter, sans-serif">
              ${(tick / 1000).toFixed(tick === 0 ? 0 : 0)}k
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + chartH - barH;
        const isJobbidder = d.label.includes("Jobbidder");
        return (
          <g key={d.label}>
            <rect
              x={x} y={y} width={barW} height={barH} rx={4}
              fill={d.color}
              opacity={isJobbidder ? 1 : 0.55}
            />
            <text
              x={x + barW / 2} y={y - 6} textAnchor="middle"
              fill={isJobbidder ? "#22d3ee" : "rgba(255,255,255,0.7)"}
              fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif"
            >
              ${(d.value / 1000).toFixed(1)}k
            </text>
            <text
              x={x + barW / 2} y={h - 12} textAnchor="middle"
              fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="Inter, sans-serif"
            >
              {d.label.split(" ")[0]}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <text x={pad.left} y={h - 44} fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="Inter, sans-serif">
        Total cost over 36 months
      </text>
    </svg>
  );
}

/* ── Savings area chart ── */
function SavingsChart() {
  const weeks = 52;
  const savingsPerJob = 1500;
  const jobsPerWeek = 3;
  const w = 640;
  const h = 240;
  const pad = { top: 16, right: 24, bottom: 40, left: 80 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxVal = weeks * jobsPerWeek * savingsPerJob; // $234,000

  const points = Array.from({ length: weeks + 1 }, (_, i) => {
    const x = pad.left + (i / weeks) * chartW;
    const y = pad.top + chartH - (i * jobsPerWeek * savingsPerJob / maxVal) * chartH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Materials savings over one year">
      <defs>
        <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 78000, 156000, 234000].map((tick) => {
        const y = pad.top + chartH - (tick / maxVal) * chartH;
        return (
          <g key={tick}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="Inter, sans-serif">
              ${(tick / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      {/* Area */}
      <polygon
        points={`${pad.left},${pad.top + chartH} ${points} ${pad.left + chartW},${pad.top + chartH}`}
        fill="url(#savingsGrad)"
      />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
      {/* End dot */}
      <circle cx={pad.left + chartW} cy={pad.top + chartH - (maxVal / maxVal) * chartH} r="5" fill="#22d3ee" />
      <text x={pad.left + chartW} y={pad.top + chartH - (maxVal / maxVal) * chartH - 10} textAnchor="end" fill="#22d3ee" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
        $234k saved
      </text>
      {/* X labels */}
      <text x={pad.left} y={h - 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">Week 1</text>
      <text x={pad.left + chartW / 2} y={h - 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">Week 26</text>
      <text x={pad.left + chartW} y={h - 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">Week 52</text>
    </svg>
  );
}

const testimonials = [
  {
    name: "Marcus Johnson",
    role: "HVAC Contractor, Atlanta",
    quote: "I was paying ServiceTitan almost $500 a month and still writing every estimate by hand. Jobbidder generated my first proposal during the demo call. I closed the client before the meeting ended.",
  },
  {
    name: "Elena Rodriguez",
    role: "Remodeling Specialist, Miami",
    quote: "My clients used to wait 3 days for a quote. Now they get a professional Good/Better/Best proposal while we're still on the phone. My close rate went from 40% to 78%.",
  },
  {
    name: "David Chen",
    role: "General Contractor, Seattle",
    quote: "The wholesale materials pricing alone paid for Jobbidder on my very first job. I saved $2,100 on a kitchen remodel and passed half to the client. They signed on the spot.",
  },
];

function WhyJobbidderPage() {
  return (
    <div className="min-h-screen bg-background">
      <JessicaWebCallWidget floating />
      {/* ── Header ── */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <JobbidderLogo size="sm" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="text-sm font-semibold text-foreground transition">Why Jobbidder</Link>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition">Sign in</Link>
            <Button asChild size="sm"><Link to="/login">Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-16 sm:pb-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-semibold text-muted-foreground mb-6">
              <Zap className="h-3 w-3 text-primary" />
              <span>The truth about contractor software</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05]">
              Every other tool is <span className="text-muted-foreground">renting you software.</span>
              <br />
              <span className="text-gradient-sia">Jobbidder hands you a money machine.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg md:text-xl font-medium text-muted-foreground max-w-2xl">
              While your competitors are stuck manually writing estimates in Word docs, Jobbidder turns a 5-minute phone call into a professional proposal with wholesale pricing — before your client hangs up.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
            The competition <span className="text-gradient-sia">isn't even close</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground font-medium">
            We compared every major contractor tool on the features that actually make you money.
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Feature</th>
                {competitors.map((c) => (
                  <th key={c.name} className="text-center py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider min-w-[100px]">{c.name}</th>
                ))}
                <th className="text-center py-4 px-3 text-xs font-bold text-primary uppercase tracking-wider min-w-[120px]">Jobbidder</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Monthly price", key: "price" as const },
                { label: "AI-generated proposals", key: "ai" as const },
                { label: "Voice call intake", key: "voice" as const },
                { label: "Wholesale materials pricing", key: "wholesale" as const },
                { label: "You own your data", key: "ownsData" as const },
                { label: "Setup time", key: "setup" as const },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/60">
                  <td className="py-4 px-4 text-sm font-semibold text-foreground">{row.label}</td>
                  {competitors.map((c) => (
                    <td key={c.name} className="py-4 px-3 text-center">
                      {row.key === "price" ? (
                        <span className="text-sm font-bold text-foreground">{c.price}</span>
                      ) : row.key === "setup" ? (
                        <span className="text-xs text-muted-foreground">{c.setup}</span>
                      ) : c[row.key as keyof typeof c] ? (
                        <Check className="h-4 w-4 text-success mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-destructive mx-auto" />
                      )}
                    </td>
                  ))}
                  <td className="py-4 px-3 text-center bg-primary/5">
                    {row.key === "price" ? (
                      <span className="text-sm font-bold text-primary">From $497/mo + setup · Enterprise $3,500/mo</span>
                    ) : row.key === "setup" ? (
                      <span className="text-xs text-primary font-semibold">60 seconds</span>
                    ) : (
                      <Check className="h-5 w-5 text-primary mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feature cards below table */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobbidderFeatures.map((f) => (
            <div key={f.label} className="rounded-xl border border-border bg-card/60 p-5 flex items-start gap-3 shadow-card">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cost Chart Section ── */}
      <section className="bg-card/30 border-y border-border/40 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">
              Look at what they're <span className="text-destructive">charging you every 3 years</span>
            </h2>
            <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
              NetSuite alone costs nearly <strong>$90,000 over 3 years</strong> — and still can't verify a single license or run a voice prequal call.
              HubSpot adds another $29,000 for generic CRM that was never built for field operations.
              <br /><br />
              These tools were designed for Fortune 500 companies. You're paying enterprise prices for a fraction of the value.
            </p>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-600" />
                <span className="text-sm font-semibold">NetSuite: $89,964 over 3 years</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-sm font-semibold">HubSpot: $28,800 over 3 years</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-sm font-semibold">ServiceTitan: $18,000 over 3 years</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">3-Year Cost Comparison</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 w-12 rounded-full bg-primary/20" />
              </div>
            </div>
            <CostChart />
          </div>
        </div>
      </section>

      {/* ── Materials Savings Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
          <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <TrendingDown className="h-12 w-12 text-primary/10" />
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Projected Materials Savings</h3>
              <p className="text-xs text-muted-foreground mt-1">Based on 3 jobs/week @ $1,500 savings per job</p>
            </div>
            <SavingsChart />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">
              The only software that <span className="text-success">actually pays you</span>
            </h2>
            <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
              We didn&apos;t just build a proposal tool. We built a materials procurement engine.
              <br /><br />
              Because we aggregate volume for thousands of contractors, we get wholesale pricing that you can&apos;t get alone. We pass those savings directly to you. Most of our users save enough on their first two jobs to pay for their entire year of Jobbidder.
            </p>
            <Button asChild variant="link" className="mt-4 p-0 h-auto text-primary font-bold">
              <Link to="/pricing">Calculate your potential savings <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-primary/5 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">Trusted by contractors nationwide</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm sm:text-base font-medium leading-relaxed italic">&quot;{t.quote}&quot;</p>
                <div className="mt-6">
                  <p className="font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NetSuite & HubSpot Replacement Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive mb-6">
            <X className="h-3 w-3" />
            <span>Still paying for NetSuite + HubSpot?</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
            Cancel both. <span className="text-gradient-sia">Jobbidder does it all</span> — built for contractors.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground font-medium">
            NetSuite and HubSpot are generic enterprise tools that cost a fortune and require months to configure. Jobbidder was purpose-built for contractor verification, pipeline management, and AI-powered proposals — and it's live in 60 seconds.
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 mb-12">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-48">Capability</th>
                <th className="text-center py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider min-w-[120px]">NetSuite</th>
                <th className="text-center py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider min-w-[120px]">HubSpot</th>
                <th className="text-center py-4 px-3 text-xs font-bold text-primary uppercase tracking-wider min-w-[120px]">Jobbidder</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Monthly cost", netsuite: "$2,499+", hubspot: "$800+", jobbidder: "$297" },
                { label: "Setup time", netsuite: "6–12 months", hubspot: "2–4 months", jobbidder: "60 seconds" },
                { label: "Contractor pipeline / CRM", netsuite: "partial", hubspot: "generic", jobbidder: "✓ built-in" },
                { label: "AI voice prequal calls", netsuite: "✗", hubspot: "✗", jobbidder: "✓ automated" },
                { label: "License & insurance verification", netsuite: "✗", hubspot: "✗", jobbidder: "✓ AI-extracted" },
                { label: "Document renewal alerts", netsuite: "✗", hubspot: "✗", jobbidder: "✓ automatic" },
                { label: "Automated SMS/email outreach", netsuite: "✗", hubspot: "✓ (extra cost)", jobbidder: "✓ included" },
                { label: "AI proposal generation", netsuite: "✗", hubspot: "✗", jobbidder: "✓ 60 seconds" },
                { label: "Wholesale materials pricing", netsuite: "✗", hubspot: "✗", jobbidder: "✓ saves $1,500/job" },
                { label: "Built for contractors", netsuite: "✗", hubspot: "✗", jobbidder: "✓ 100%" },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/60">
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">{row.label}</td>
                  {[row.netsuite, row.hubspot].map((val, i) => (
                    <td key={i} className="py-3 px-3 text-center">
                      {val === "✗" ? (
                        <X className="h-4 w-4 text-destructive mx-auto" />
                      ) : val.startsWith("✓") ? (
                        <span className="text-xs font-medium text-muted-foreground">{val}</span>
                      ) : (
                        <span className="text-sm font-bold text-foreground">{val}</span>
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center bg-primary/5">
                    {row.jobbidder === "✗" ? (
                      <X className="h-4 w-4 text-destructive mx-auto" />
                    ) : row.jobbidder.startsWith("✓") ? (
                      <div className="flex items-center justify-center gap-1">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-primary">{row.jobbidder.replace("✓ ", "")}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-primary">{row.jobbidder}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">NetSuite does</p>
            <p className="text-sm text-muted-foreground leading-relaxed">General ERP, accounting, inventory — none of it built for managing field contractors or their credentials. You need a consultant just to set it up.</p>
            <p className="mt-4 text-2xl font-bold text-destructive">$30,000+/yr</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">HubSpot does</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Generic contact management and email sequences. No contractor credentialing, no voice AI, no document verification. You'll spend weeks building custom workflows.</p>
            <p className="mt-4 text-2xl font-bold text-destructive">$9,600+/yr</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Jobbidder Enterprise does</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Prequals, verifies, pipelines, and manages contractors — all automated. Plus AI proposals, wholesale pricing, SMS outreach, and a full Kanban CRM. Purpose-built for your business.</p>
            <p className="mt-4 text-2xl font-bold text-primary">$3,500/mo — replaces both</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <div className="rounded-3xl bg-gradient-sia p-8 sm:p-16 text-center text-primary-foreground shadow-glow">
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tighter">
            Stop renting. Start winning.
          </h2>
          <p className="mt-6 text-base sm:text-lg font-medium opacity-90 max-w-2xl mx-auto">
            Join the elite contractors who have ditched the monthly SaaS tax and upgraded to the Jobbidder money machine.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="font-bold">
              <Link to="/login">Get Started Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/20 hover:bg-white/10 font-bold">
              <Link to="/pricing">View Pricing Plans</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs font-medium opacity-70">
            No credit card required to start · 60-second setup · You own your data
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <JobbidderLogo size="sm" />
          <div className="flex gap-8 text-sm font-semibold text-muted-foreground">
            <Link to="/pricing" className="hover:text-foreground transition">Pricing</Link>
            <Link to="/why-jobbidder" className="hover:text-foreground transition">Why Jobbidder</Link>
            <Link to="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} Jobbidder · A product of{" "}
            <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="underline hover:text-primary transition">
              Sudden Impact Agency
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
