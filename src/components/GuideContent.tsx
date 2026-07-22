import {
  PhoneCall, FileText, UploadCloud, ShieldCheck, Layers,
  Calculator, BookOpen, ScrollText, PenLine, Database, Check, ArrowRight, Search,
} from "lucide-react";

/**
 * Shared guide content — rendered both on the public /how-it-works marketing
 * page and inside the app under the "Guide" tab. Keeping the steps, FAQ, and
 * standout copy here means there's one source of truth for both.
 */

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  what: string;
  how: string[];
  why: string;
}

export const GUIDE_STEPS: Step[] = [
  {
    icon: PhoneCall,
    title: "1. A lead comes in — by phone, form, or link",
    what: "Every contractor gets a personal intake link and an AI voice assistant, Jessica, who can answer the phone, qualify the caller, and capture the job details 24/7.",
    how: [
      "Share your intake link (jobbidder.io/go/your-company) or let Jessica answer inbound calls.",
      "Jessica asks the same questions a good estimator would: what, where, scope, timeline, and whether it's a public/prevailing-wage job.",
      "The answers land in your pipeline as a new lead — no data entry, nothing lost to voicemail.",
    ],
    why: "Most jobs are won or lost on speed-to-lead. Answering every call and form the moment it arrives means you stop leaking work to whoever called back first.",
  },
  {
    icon: FileText,
    title: "2. Turn the job into a proposal in about 60 seconds",
    what: "From the New Proposal screen you paste the scope (or type it), pick the trade, and Jobbidder drafts a full itemized proposal — scope of work, materials, labor, timeline, warranty, and Good/Better/Best pricing.",
    how: [
      "Enter client + job details and the description of the work.",
      "Jobbidder's AI builds the estimate the way a real tradesperson in that trade would — right materials, labor phases, and units.",
      "You review, tweak any line, and send. The whole thing takes about a minute.",
    ],
    why: "A proposal that used to take an evening of spreadsheet work goes out while the lead is still hot — and it looks like it came from a company three times your size.",
  },
  {
    icon: UploadCloud,
    title: "3. Upload the architect's spec — nothing gets dropped",
    what: "For commercial and institutional work you can upload the full architect's spec PDF. Jobbidder reads the entire document and pulls out every distinct system that has to be priced.",
    how: [
      "Upload the spec PDF (up to 20 MB). The AI reads the whole document, however long it is.",
      "It lists every system it finds — membrane, canopy, gutters, downspouts, drip edge, coping, flashing, and so on — each as its own line to price.",
      "You review the extracted list, remove anything out of scope, and generate. Every system gets its own materials and labor.",
    ],
    why: "This is the exact failure we fixed: a real $295,644 school reroof once came back 44% low because the spec text got silently cut off and whole systems vanished. Now the full spec reaches the AI and every system is priced.",
  },
  {
    icon: ShieldCheck,
    title: "4. The scope-completeness guard catches what's missing",
    what: "After a proposal is generated, Jobbidder compares the systems named in your input against the line items it produced — and warns you if something valuable wasn't priced.",
    how: [
      "If your description mentions gutters, a canopy, or drip edge but no matching line item exists, the proposal shows a red 'Possible incomplete scope' banner listing exactly what's missing.",
      "You add the missing work or regenerate before it ever reaches the client.",
    ],
    why: "A confident low number is the most dangerous kind of estimate — it's the one you accidentally send. The guard makes silent omissions loud, so you don't leave $60k of canopy off a bid.",
  },
  {
    icon: Calculator,
    title: "5. Overhead is trade-aware, so the total is realistic",
    what: "Overhead (general conditions, bonds, insurance, prevailing-wage admin) is applied as a real line in the total — and it's tuned per trade.",
    how: [
      "A small residential repair carries a light overhead; commercial roofing carries far more (the Echols job carried 26.9%).",
      "Jobbidder defaults commercial roofing to 25% and lets you set your own per-trade overhead in Settings → Pricing & AI.",
      "Overhead shows as its own line in the totals, so clients see a professional, itemized number.",
    ],
    why: "A flat 12% overhead quietly underprices institutional work by double digits. Trade-aware overhead is the difference between a bid that wins and one that loses you money.",
  },
  {
    icon: BookOpen,
    title: "6. Your Cost Catalog grounds pricing in real numbers",
    what: "Instead of trusting an AI to guess prices, Jobbidder prices recognized materials from a catalog of real unit costs — starting with a national starter catalog and, better, your own supplier pricing.",
    how: [
      "Turn it on in Settings → Cost Catalog and add your items (or copy from the national starter catalog and tune them).",
      "When the AI produces a line it recognizes — 'TPO membrane', 'gutters', 'drip edge' — it's priced from your unit cost, not a guess.",
      "Anything not yet in your catalog still gets a smart AI estimate, and the proposal shows how much of it was grounded in real costs.",
    ],
    why: "An AI guessing '$1.35 a square foot' is the ceiling on how much you can trust an estimate. A real dollar figure you can point to — and defend to a client — is the floor of a tool you'd actually stake a bid on.",
  },
  {
    icon: Layers,
    title: "7. Good / Better / Best pricing, built in",
    what: "Every proposal comes as three tiers so the client chooses a scope, not whether to hire you.",
    how: [
      "Good is your base scope; Better and Best add upgraded materials and more work, at prices you control.",
      "Set how much more Better and Best cost once in Settings; it applies to every proposal automatically.",
    ],
    why: "Three-option pricing consistently lifts the average job size — clients trade up when the choice is framed as good/better/best instead of yes/no.",
  },
  {
    icon: ScrollText,
    title: "8. Public-job & prevailing-wage safety net",
    what: "Jobbidder flags jobs that look like government, school, or publicly funded work so they aren't accidentally priced at market rate.",
    how: [
      "A single intake question ('is this public/grant-funded?') plus an automatic scan of the job details flags the proposal.",
      "You get a prevailing-wage notice with reference rates before you send.",
    ],
    why: "Bidding a prevailing-wage job at private-market labor is a fast way to win the job and lose the year. The flag keeps you from that mistake.",
  },
  {
    icon: PenLine,
    title: "9. Send, e-sign, and collect the deposit",
    what: "The finished proposal is a shareable link and PDF the client can accept and sign, with the deposit collected right there.",
    how: [
      "Send by email/SMS or share the link. The client picks a tier, e-signs, and pays the deposit.",
      "You're notified and the job moves forward — no chasing paperwork.",
    ],
    why: "The faster a client can say yes and put money down, the more jobs close. Removing every step between 'I like it' and 'it's booked' wins work.",
  },
  {
    icon: Database,
    title: "10. You own your data — and it makes you money",
    what: "Your leads, proposals, pricing, and win history are yours. Jobbidder also runs a referral program that pays you.",
    how: [
      "Export your data anytime, or connect it to other tools you use (like HubSpot today, with more coming). Your pipeline isn't held hostage.",
      "Refer other contractors and earn — payout or account credit, your choice.",
    ],
    why: "The big platforms rent you access to your own customer data. Jobbidder is built the opposite way: you own it, and the tool pays you instead of the other way around.",
  },
  {
    icon: Search,
    title: "11. Ask your documents — the Knowledge Base",
    what: "Upload your documents (or pre-load your existing proposals) and ask a plain-English question. You get a straight answer, and it shows you exactly which document the answer came from.",
    how: [
      "Open Knowledge Base, upload a PDF or click “Pre-load my existing proposals,” and it's ready to search in seconds.",
      "Ask something like “What warranty did we quote on the Echols roof?” — the answer shows you which document it used, and tells you honestly when your documents don't have the answer.",
    ],
    why: "Your business knowledge is scattered across hundreds of documents. This turns that pile into something you can just ask — instead of digging — while keeping your documents private to your own account.",
  },
];

export const GUIDE_FAQS: { q: string; a: string }[] = [
  {
    q: "Is Jobbidder going to replace my estimator or my judgment?",
    a: "No — it does the tedious 90% (reading the spec, listing every system, drafting materials and labor, formatting a client-ready document) so your judgment goes on the 10% that matters: checking quantities, adjusting a price, deciding scope. You review and approve every proposal before it leaves.",
  },
  {
    q: "How accurate are the numbers, really?",
    a: "As accurate as what you feed it. Right out of the box the AI produces a realistic estimate. Turn on your Cost Catalog with your real supplier pricing and the material side stops being a guess — the same job always prices the same way, from numbers you can defend line by line. The one thing you still confirm yourself is the quantities (how much of each material the job needs), which you check when you review.",
  },
  {
    q: "What happens with a giant commercial spec — will it choke or cut things off?",
    a: "No. You can paste a huge amount of text (up to about 25 pages — with a clear warning if you somehow go over, never a silent cut), or upload the full spec PDF and let Jobbidder read the entire document. It then lists every system so nothing gets dropped, and a completeness check warns you if a named system wasn't priced.",
  },
  {
    q: "Does it handle prevailing-wage and public jobs?",
    a: "Yes. Jobbidder asks whether the job is government/school/publicly funded and also scans the job details automatically, then flags the proposal with a prevailing-wage notice and reference rates so you don't bid public work at private-market labor.",
  },
  {
    q: "How is this different from ServiceTitan, Jobber, or Housecall Pro?",
    a: "Those are scheduling and dispatch systems that add estimating on as an afterthought; they charge per worker per month, take months to set up, and keep your data. Jobbidder is built around estimating first: it writes accurate, line-by-line proposals with three price options in about a minute, prices from your real costs, answers your phone with AI, lets you own and export your data, and even pays you for referrals.",
  },
  {
    q: "Do I need to be technical to set it up?",
    a: "No. Sign in, set your trade and pricing once, share your intake link, and you're generating proposals the same day. There's no multi-month onboarding or consultant required.",
  },
  {
    q: "What trades does it support?",
    a: "Roofing, HVAC, plumbing, electrical, flooring, painting, glazing, landscaping, remodeling/general contracting, solar, and moving — each with its own estimator 'playbook' so the proposal reads like it came from a specialist in that trade.",
  },
  {
    q: "Can I use my own pricing and branding?",
    a: "Yes. Set per-trade labor rates, markup, overhead, and profit; build your own cost catalog; and (on eligible plans) white-label proposals with your logo and colors. Every proposal uses your numbers, not ours.",
  },
  {
    q: "Where does my data live, and can I get it out?",
    a: "Your data is yours. Jobbidder runs on secure, modern systems, and every contractor only ever sees their own records — never anyone else's. You can export your data or connect it to tools like HubSpot anytime. You're never locked in.",
  },
  {
    q: "How much does it cost?",
    a: "Plans scale from solo operators to multi-crew shops, with a free way to try it. See the Pricing page for current tiers — and remember the referral program can offset or eliminate your cost.",
  },
];

export const GUIDE_STANDOUTS: { title: string; body: string }[] = [
  { title: "Estimating first, not scheduling first", body: "Everyone else treats estimating as an add-on. It's the whole point of Jobbidder — a real, line-by-line proposal with three price options in about a minute." },
  { title: "Priced from real costs", body: "Your cost catalog makes material pricing consistent and easy to defend, instead of an AI guess you have to hope is close." },
  { title: "It reads the actual spec", body: "Upload the architect's PDF and every system gets priced — with a check that flags anything missing before you send." },
  { title: "It answers your phone", body: "Jessica, the AI voice assistant, qualifies leads 24/7 so you stop losing jobs to whoever called back first." },
  { title: "You own your data", body: "No per-user lock-in, no holding your customers hostage. Export it or connect it to your other tools, freely." },
  { title: "It pays you back", body: "A built-in referral program turns your network into income instead of a subscription bill." },
  { title: "It answers your documents", body: "The Knowledge Base lets you ask questions across everything you've uploaded and get answers that show their sources — your files, kept private to your account." },
];

/**
 * The core guide body: steps, standouts, FAQ. No page chrome (no header/footer/
 * hero) so it can drop into the marketing page or the in-app Guide tab alike.
 */
export function GuideBody() {
  return (
    <div className="space-y-14">
      {/* Steps */}
      <div className="space-y-6">
        {GUIDE_STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{s.title}</h2>
                  <p className="text-muted-foreground mt-2">{s.what}</p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">How it works</p>
                      <ul className="space-y-2">
                        {s.how.map((h, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Why it matters</p>
                      <p className="text-sm leading-relaxed">{s.why}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How we stand out */}
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center">How Jobbidder stands out</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          {GUIDE_STANDOUTS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center">Questions contractors ask</h2>
        <div className="mt-8 max-w-3xl mx-auto divide-y divide-border rounded-2xl border border-border bg-card">
          {GUIDE_FAQS.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold list-none">
                <span>{f.q}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
