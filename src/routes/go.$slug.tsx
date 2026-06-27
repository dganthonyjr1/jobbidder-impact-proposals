import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { getBrandingBySlug } from "@/lib/go-branding.server";

type Step =
  | "greeting" | "name" | "email" | "address"
  | "job_type" | "scope" | "materials" | "timeline"
  | "terms" | "submitting" | "done";

const STEP_ORDER: Step[] = [
  "greeting", "name", "email", "address",
  "job_type", "scope", "materials", "timeline",
  "terms", "submitting", "done",
];

function nextStep(current: Step): Step {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
}

export const Route = createFileRoute("/go/$slug")({
  loader: ({ params }) => getBrandingBySlug({ data: params.slug }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.businessName ? `${loaderData.businessName} — Free Estimate` : "Get Your Free Estimate" }],
  }),
  component: BrandedIntakePage,
});

function BrandedIntakePage() {
  const { slug } = Route.useParams();
  const branding = Route.useLoaderData();

  const [step, setStep] = useState<Step>("greeting");
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [lead, setLead] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const businessName = branding?.businessName ?? "Your Estimator";
  const primaryColor = branding?.primaryColor ?? "#10b981";
  const logoUrl = branding?.logoUrl ?? null;

  const QUESTIONS: Record<Step, string> = {
    greeting: `Hi! 👋 I'm the virtual estimator for ${businessName}. I can get you a free, detailed Good/Better/Best estimate in about 60 seconds. Ready to start?`,
    name: "What's your full name?",
    email: "What's your email address? (Your proposal will be sent here)",
    address: "What's the project address or location? (City and state is fine if you don't have the full address yet)",
    job_type: "What type of work do you need done? (e.g. roof replacement, kitchen remodel, flooring, HVAC, painting…)",
    scope: "Please describe the scope of work in detail. What needs to be done?",
    materials: "What are the key materials or items needed? (Or type 'standard' if you're not sure)",
    timeline: "Do you have a deadline or preferred timeline? (Or type 'flexible' if open)",
    terms: "Any specific payment terms or anything else to include? (Or type 'standard')",
    submitting: "Perfect! Generating your Good/Better/Best proposal now…",
    done: "",
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "bot", text: QUESTIONS.greeting }]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step !== "submitting" && step !== "done") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  function addBot(text: string) {
    setMessages((m) => [...m, { role: "bot", text }]);
  }
  function addUser(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
  }

  async function handleSend() {
    const val = input.trim();
    if (!val || step === "submitting" || step === "done") return;
    setInput("");

    if (step === "greeting") {
      addUser(val);
      const ns = nextStep("greeting");
      setStep(ns);
      setTimeout(() => addBot(QUESTIONS[ns]), 400);
      return;
    }

    addUser(val);
    const updatedLead = { ...lead };

    if (step === "name")       updatedLead.client_name = val;
    else if (step === "email") updatedLead.client_email = val;
    else if (step === "address") updatedLead.job_address = val;
    else if (step === "job_type") updatedLead.trade_type = val;
    else if (step === "scope") updatedLead.job_description = val;
    else if (step === "materials" && val.toLowerCase() !== "standard")
      updatedLead.job_description = (updatedLead.job_description || "") + `. Materials: ${val}`;
    else if (step === "timeline" && val.toLowerCase() !== "flexible")
      updatedLead.job_description = (updatedLead.job_description || "") + `. Timeline: ${val}`;
    else if (step === "terms" && val.toLowerCase() !== "standard")
      updatedLead.job_description = (updatedLead.job_description || "") + `. Terms: ${val}`;

    setLead(updatedLead);
    const ns = nextStep(step);
    setStep(ns);

    if (ns === "submitting") {
      setTimeout(() => addBot(QUESTIONS.submitting), 400);
      await submitLead(updatedLead);
    } else {
      setTimeout(() => addBot(QUESTIONS[ns]), 400);
    }
  }

  async function submitLead(data: Record<string, string>) {
    try {
      const res = await fetch("/api/public/intake-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          client_name: data.client_name,
          client_email: data.client_email,
          client_phone: "",
          job_address: data.job_address,
          trade_type: data.trade_type,
          job_description: data.job_description,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Submission failed");
      setStep("done");
      const firstName = (data.client_name || "").split(" ")[0];
      setTimeout(() => {
        addBot(`✅ Your proposal is ready, ${firstName}! We've sent it to ${data.client_email}. You can also view it here:`);
        setMessages((m) => [...m, { role: "bot", text: `__LINK__${json.proposal_url}` }]);
      }, 800);
    } catch {
      setStep("terms");
      addBot("Sorry, something went wrong generating your proposal. Please try again.");
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // Not white-label eligible
  if (!branding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
        <div>
          <p className="text-2xl font-bold mb-2">Page not found</p>
          <p className="text-muted-foreground">This intake link is not active.</p>
        </div>
      </div>
    );
  }

  const isInputDisabled = step === "submitting" || step === "done";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `color-mix(in srgb, ${primaryColor} 8%, #f9fafb)` }}
    >
      {/* Header */}
      <div className="w-full max-w-lg mb-6 flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={businessName} className="h-12 w-auto object-contain rounded" />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ background: primaryColor }}
          >
            {businessName[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="font-bold text-xl">{businessName}</h1>
          <p className="text-sm text-muted-foreground">Free Estimate — Good / Better / Best</p>
        </div>
      </div>

      {/* Chat card */}
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Card header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: primaryColor }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{businessName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{businessName}</p>
            <p className="text-xs text-white/70">Get a free estimate in 60 seconds</p>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex flex-col gap-3 overflow-y-auto p-4"
          style={{ minHeight: "300px", maxHeight: "420px" }}
        >
          {messages.map((m, i) => {
            if (m.text.startsWith("__LINK__")) {
              const url = m.text.replace("__LINK__", "");
              return (
                <div key={i} className="flex justify-start">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white underline shadow-sm"
                    style={{ background: primaryColor }}
                  >
                    View your proposal →
                  </a>
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user" ? "text-white" : "bg-gray-100 text-gray-800"
                  }`}
                  style={m.role === "user" ? { background: primaryColor } : undefined}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {step === "submitting" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building your Good/Better/Best proposal…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isInputDisabled && (
          <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={step === "greeting" ? 'Type "yes" to start…' : "Type your answer…"}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
              style={{ background: primaryColor }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-200 px-4 py-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Proposal sent to your email
          </div>
        )}
      </div>
    </div>
  );
}
