import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Phone, FileText, Clock, Zap, ArrowRight, TrendingDown, Shield, Mail, MessageSquare, Palette } from "lucide-react";

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
    name: "Jobber",
    price: "$300/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Manual estimates",
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
    name: "Housecall Pro",
    price: "$329/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Manual estimates",
  },
  {
    name: "Buildxact",
    price: "$299/mo",
    ai: false,
    voice: false,
    wholesale: false,
    ownsData: false,
    setup: "Upload blueprints manually",
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
    { label: "ServiceTitan", value: 18000, color: "#ef4444" },
    { label: "Housecall Pro", value: 11844, color: "#f97316" },
    { label: "Jobber", value: 10800, color: "#eab308" },
    { label: "Buildxact", value: 10764, color: "#84cc16" },
    { label: "Jobbidder Journeyman", value: 10692, color: "#7c3aed" },
    { label: "Jobbidder Principal", value: 6500, color: "#22d3ee" },
  ];
  const max = 20000;
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
      {[0, 5000, 10000, 15000, 20000].map((tick) => {
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
      {/* ── Header ── */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-gradient-sia">Jobbidder</span>
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
                      ) : c[row.key] ? (
                        <Check className="h-4 w-4 text-success mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-destructive mx-auto" />
                      )}
                    </td>
                  ))}
                  <td className="py-4 px-3 text-center bg-primary/5">
                    {row.key === "price" ? (
                      <span className="text-sm font-bold text-primary">Journeyman $297/mo · Principal $6,500 once</span>
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
              <span className="text-sm font-semibold text-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Math ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
              The math they <span className="text-gradient-sia">don't want you to see</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground font-medium">
              Three years of renting vs. owning. The numbers speak for themselves.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Jobber over 3 years</span>
                  <span className="text-lg font-bold text-destructive">$10,800</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">And you still write every estimate by hand.</p>
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">ServiceTitan over 3 years</span>
                  <span className="text-lg font-bold text-destructive">$18,000</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Per technician. And you still write every estimate by hand.</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-glow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">Jobbidder Principal — one time</span>
                  <span className="text-2xl font-bold text-primary">$6,500</span>
                </div>
                <p className="mt-1 text-xs text-primary/80 font-semibold">You never write another estimate again. Ever.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8 shadow-card">
            <h3 className="font-display text-lg font-bold mb-6">3-year total cost</h3>
            <CostChart />
          </div>
        </div>

        {/* Materials savings */}
        <div className="mt-16 sm:mt-24 rounded-2xl border border-border bg-card/30 p-6 sm:p-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Your materials savings in <span className="text-gradient-sia">year one</span>
              </h3>
              <p className="mt-3 text-muted-foreground font-medium">
                At 3 jobs per week, the wholesale vs. retail materials difference is massive — whether you pass savings to clients or keep them as margin.
              </p>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="font-display text-5xl sm:text-6xl font-bold text-primary">$234,000</span>
                <span className="text-muted-foreground font-medium">saved in year one</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Based on $1,500 average wholesale savings per job × 3 jobs/week × 52 weeks.
              </p>
            </div>
            <div>
              <SavingsChart />
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow Comparison ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
            What happens when a client calls?
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Competitor path */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <X className="h-5 w-5 text-destructive" />
              <span className="font-display font-bold text-lg text-destructive">Your competitor</span>
            </div>
            <div className="space-y-0">
              {[
                { icon: Phone, text: "Client calls, leaves voicemail or plays phone tag", time: "Day 1" },
                { icon: FileText, text: "Contractor writes estimate in Word or spreadsheet", time: "Day 1-2" },
                { icon: Clock, text: "Sends proposal 3 days later via email", time: "Day 3" },
                { icon: X, text: "Client already hired someone else", time: "Day 4" },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 pb-8 last:pb-0 relative">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-destructive/10 p-2 shrink-0">
                      <step.icon className="h-4 w-4 text-destructive" />
                    </div>
                    {i < 3 && <div className="w-px flex-1 bg-destructive/20 mt-2" />}
                  </div>
                  <div className="pb-2">
                    <span className="text-xs font-bold text-destructive/70 uppercase tracking-wider">{step.time}</span>
                    <p className="mt-1 text-sm font-medium text-foreground/80">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Jobbidder path */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-glow">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-lg text-primary">You, with Jobbidder</span>
            </div>
            <div className="space-y-0">
              {[
                { icon: Phone, text: "AI answers the call, gathers job details via natural conversation", time: "Minute 0" },
                { icon: Zap, text: "Proposal generated automatically with Good / Better / Best tiers", time: "Minute 1" },
                { icon: Mail, text: "Client receives professional branded proposal before hanging up", time: "Minute 2" },
                { icon: Shield, text: "Contractor closes the deal same day", time: "Same day" },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 pb-8 last:pb-0 relative">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-primary/15 p-2 shrink-0">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                    {i < 3 && <div className="w-px flex-1 bg-primary/25 mt-2" />}
                  </div>
                  <div className="pb-2">
                    <span className="text-xs font-bold text-primary/80 uppercase tracking-wider">{step.time}</span>
                    <p className="mt-1 text-sm font-medium text-foreground">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
            What contractors are <span className="text-gradient-sia">saying</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8 shadow-card flex flex-col">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-sm font-medium text-foreground/90 leading-relaxed flex-1">"{t.quote}"</p>
              <div className="mt-6 pt-6 border-t border-border/40">
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground font-medium">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 sm:p-12 md:p-16 text-center shadow-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-40" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter max-w-3xl mx-auto">
              Stop renting tools that don't work.
              <br />
              <span className="text-gradient-sia">Own the system that pays for itself.</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground font-medium max-w-xl mx-auto">
              Start your free trial today. No credit card required. Your first proposal is on us.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/login">Get started free <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Jobbidder · A product of{" "}
        <a href="https://suddenimpactagency.io" target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-primary transition">
          Sudden Impact Agency
        </a>
      </footer>
    </div>
  );
}
