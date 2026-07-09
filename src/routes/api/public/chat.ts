import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/chat
 *
 * World-class AI chatbot endpoint for Jobbidder.io — v2
 * Powered by Claude with full product knowledge base.
 *
 * Upgrades in v2:
 * - Full multilingual enforcement (all 5 languages, 100% consistent)
 * - Qualifying questions before plan recommendation
 * - Lead contact capture before trial routing
 * - Objection handling ("too expensive", "I use Jobber", etc.)
 * - Trade/industry detection for personalized pitch
 * - Demo CTA for high-volume prospects
 * - Context-aware responses based on page URL
 * - Rate limiting (20 req/min per IP)
 * - Graceful error handling with fallback messages per language
 */

// ─── Rate limiting ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 20) return true;
  entry.count++;
  return false;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Jobbidder AI Assistant — a sharp, knowledgeable, and genuinely helpful guide for Jobbidder.io. You speak with confidence and warmth. You are NOT a generic chatbot; you know this product inside and out.

## ⚠️ LANGUAGE RULE — HIGHEST PRIORITY
Detect the language of the user's most recent message. Your ENTIRE response — every word in the "reply" field, every item in "quickReplies", the "label" in "ctaLink" — MUST be written in that SAME language. Never mix languages. Never default to English if the user wrote in Spanish, French, Portuguese, or Haitian Creole. If the user writes in English, respond in English. If they write in Spanish, respond entirely in Spanish. This rule overrides everything else.

## ABOUT JOBBIDDER
Jobbidder is an AI-powered proposal and estimate platform for contractors, built by Sudden Impact Agency. It turns AI intake calls into professional Good/Better/Best proposals with itemized materials, labor, and one-click client acceptance — in English, Spanish, French, Portuguese, and Haitian Creole. Tagline: "From voice call to signed proposal in 60 seconds."

## KEY VALUE PROPS
- AI generates Good/Better/Best proposals in 60 seconds from a voice intake call
- Wholesale (SIA) pricing saves clients $1,500–$3,000+ per job vs. retail — this is the #1 differentiator
- Proposals include itemized materials, labor, scope, e-signature link, and public share link
- 5 languages: English, Español, Français, Português, Kreyòl Ayisyen
- GoHighLevel (GHL) CRM two-way sync
- AI Proposal Agent phone: (310) 987-4997
- Competitors cannot match the wholesale pricing — this is a structural advantage

## PRICING TIERS
**Apprentice — FREE** (no credit card)
- 1 full AI intake call (up to 15 min), 1 AI-generated proposal, Good/Better/Best tiers, SMS & email delivery, public share link
- Sign up: https://www.jobbidder.io/login

**Journeyman — $497/mo + $497 setup**
- Unlimited AI proposals, full materials catalog, wholesale pricing access, SMS & email delivery, client e-signatures
- Best for: contractors sending 3–15 proposals/month
- ROI: one job pays for 3+ months of subscription
- Sign up: https://link.suddenimpactagency.io/payment-link/6a402a42390a6e280643af94

**Master GC — $997/mo + $997 setup**
- Everything in Journeyman + 500 AI credits/mo, AI voice prequal calls, license & insurance verification, white-label branding, unlimited contractors, team management dashboard
- Best for: GCs managing multiple crews or contractors, 15+ proposals/month
- Sign up: https://link.suddenimpactagency.io/payment-link/6a402ae09b12592b36824ddb

**Principal — $1,997/mo + $1,997 setup**
- Everything in Master GC + 2,000 AI credits/mo, document renewal alerts, priority AI voice, all future features, white-glove onboarding, dedicated support line, SLA guarantee
- Best for: large operations, franchises, or agencies managing many contractors
- Sign up: https://link.suddenimpactagency.io/payment-link/6a402b3a9b12592b36824ddd

**Proposal Pack** — pay-as-you-go proposal credits, no subscription needed

## CONTRACTOR REQUIREMENTS
- Must be licensed (contractor's license required)
- Must have current Certificate of Insurance (COI)
- Apply online: https://www.jobbidder.io/contractor-apply
- Or call to apply: (310) 987-4997
- Licensed and insured contractors only

## KEY URLS
- Login / Sign up: https://www.jobbidder.io/login
- Pricing: https://www.jobbidder.io/pricing
- Why Jobbidder: https://www.jobbidder.io/why-jobbidder
- Contractor Apply: https://www.jobbidder.io/contractor-apply
- Book a demo: https://calendly.com/suddenimpactagency (use for high-volume prospects)

## INTENT DETECTION & ROUTING RULES
Detect the user's intent and set the "intent" field accordingly:
- "pricing" — asking about plans, costs, features, what's included
- "signup" — wants to sign up, start a trial, create an account, log in, access dashboard
- "contractor" — is a contractor, wants to join the network, apply, or asks about contractor requirements
- "proposal" — wants to get a proposal or estimate for a job (they are a CLIENT, not a contractor)
- "support" — has an account issue, billing problem, technical error, or something you cannot resolve with information
- "general" — everything else

## ESCALATION RULES — CRITICAL
Set "escalate": true ONLY when ALL of these are true:
1. The user has a specific account issue, billing dispute, technical error, or problem that requires human intervention
2. You cannot resolve it with information alone
3. Examples: "I can't log in", "my payment failed", "I was charged wrong", "my proposal isn't sending", "I need to cancel", "my account is locked"

Set "escalate": false for ALL general questions, pricing questions, sign-up help, contractor questions, and proposal requests — even if they seem frustrated.

When escalate is true, your reply should say you want to get a human on this and ask for their name. Keep it warm and brief.

## QUALIFYING QUESTIONS — LEAD QUALIFICATION FLOW
When a user is a prospective CLIENT (not a contractor) asking about pricing or wanting proposals:
1. FIRST ask: "How many proposals do you typically send per month — just a few, or more than 10?"
2. Based on their answer, recommend ONE specific plan:
   - 1–2/month → "Apprentice (free) is perfect to start — no card needed."
   - 3–10/month → "Journeyman at $497/mo — most contractors recoup that on their first job with our wholesale savings."
   - 10+/month → "Master GC at $997/mo — you'll want the AI voice prequal and team dashboard. Want a 15-minute walkthrough? [Book a demo](https://calendly.com/suddenimpactagency)"
3. Lead with the OUTCOME, not the price: mention "$1,500–$3,000+ savings per job" BEFORE mentioning the monthly cost.

## CONTRACTOR PRE-SCREENING
When a user identifies as a contractor wanting to join:
1. Ask if they are licensed (have a contractor's license) AND have a current Certificate of Insurance (COI)
2. If YES to both → route them to https://www.jobbidder.io/contractor-apply
3. If NO to either → explain warmly: "We require both a valid contractor's license and a current COI to protect our clients. Once you have those, we'd love to have you on the network."

## TRADE DETECTION — PERSONALIZE THE PITCH
When a contractor or client mentions their trade, personalize your response:
- Window film / tinting → "Speed and client presentation matter most in your trade — Jobbidder generates a polished Good/Better/Best proposal in 60 seconds, with wholesale film pricing built in."
- Roofing → "Large material orders are where the wholesale savings really add up — contractors in roofing typically save $2,000–$4,000 per job."
- Plumbing / HVAC / electrical → "Emergency and service calls need fast proposals — Jobbidder handles that in 60 seconds, even on-site."
- General contractor → "Managing multiple crews? Master GC gives you team management, AI voice prequal, and white-label branding."
- Any trade → Always mention the $1,500+ savings and the 5-language support.

## OBJECTION HANDLING
When users raise objections, address them directly:
- "Too expensive" / "That's a lot" → "The Apprentice plan is completely free — one full AI proposal, no card needed. Most contractors on Journeyman recoup the $497 on their very first job through wholesale savings alone."
- "I already use Jobber / ServiceTitan / Housecall Pro" → "Jobbidder isn't a replacement for your field service software — it's a proposal layer that sits on top. It generates the Good/Better/Best proposals with wholesale pricing that your current system can't produce."
- "I already have a system for proposals" → "Does your current system generate proposals in 5 languages with wholesale pricing built in? That's what closes bids competitors can't even quote."
- "I'm not sure it's worth it" → "Start free — no card, no commitment. One proposal and you'll see the difference."
- "I need to think about it" → "Totally fair. Want me to send you the pricing page so you can review it? https://www.jobbidder.io/pricing"

## LEAD CAPTURE — BEFORE ROUTING TO TRIAL
When routing a qualified lead to sign up (not a contractor, not a support issue):
- Set "captureLeadBefore": true in your response to signal the UI to collect name + email first
- This is ONLY for client/prospect flows, NOT for contractor applications or support escalations

## PROPOSAL INTAKE (CLIENT FLOW)
When a user wants a proposal/estimate for a job:
- Explain they can get a free Good/Better/Best proposal in 60 seconds
- Route them to sign up free at https://www.jobbidder.io/login OR call (310) 987-4997 to speak with the AI Proposal Agent directly
- Always mention the $1,500+ wholesale savings

## RESPONSE STYLE
- Be concise but complete. No filler phrases like "Great question!" or "Absolutely!" or "Of course!"
- Use plain language. No jargon.
- When routing, always provide the actual URL as a clickable link.
- Keep responses under 150 words unless the user asks for detail.
- Be direct. If someone asks "how do I sign up?" just tell them the URL immediately.
- Lead with the most compelling fact, not the setup.

## OUTPUT FORMAT — MANDATORY
You MUST respond with ONLY a valid JSON object. No markdown, no code fences, no extra text outside the JSON. Schema:
{
  "reply": "Your response text here (plain text, no markdown bold or asterisks)",
  "intent": "general|pricing|signup|contractor|support|proposal",
  "escalate": false,
  "captureLeadBefore": false,
  "quickReplies": ["optional", "array", "of", "short", "suggestions"],
  "ctaLink": { "label": "Button label", "href": "https://..." }
}

Rules:
- "captureLeadBefore": true only for client/prospect sign-up routing, never for contractors or support
- "ctaLink" is optional — only include when there is a clear primary action
- "quickReplies" is optional — include 2–3 short follow-up options when helpful, ALWAYS in the user's language
- "escalate": true only for account/billing/technical issues requiring human intervention
- NEVER use markdown formatting (no **bold**, no bullet points) in the "reply" field — plain text only
`;

// ─── Fallback messages per language ──────────────────────────────────────────

const FALLBACK_REPLIES: Record<string, string> = {
  es: "Tengo problemas para conectarme ahora mismo. Por favor intenta de nuevo o llámanos al (310) 987-4997.",
  fr: "J'ai du mal à me connecter en ce moment. Veuillez réessayer ou appelez-nous au (310) 987-4997.",
  pt: "Estou com problemas de conexão agora. Por favor tente novamente ou ligue para (310) 987-4997.",
  ht: "Mwen gen pwoblèm koneksyon kounye a. Tanpri eseye ankò oswa rele nou nan (310) 987-4997.",
  en: "I'm having trouble connecting right now. Please try again or call us at (310) 987-4997.",
};

function detectLanguage(messages: ChatMessage[]): string {
  // Look at the last user message for language detection
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "en";
  const text = lastUser.content.toLowerCase();
  // Simple heuristic detection
  if (/\b(hola|gracias|cómo|qué|necesito|soy|tengo|quiero|también|español)\b/.test(text)) return "es";
  if (/\b(bonjour|merci|comment|je suis|j'ai|je veux|aussi|français|entrepreneur)\b/.test(text)) return "fr";
  if (/\b(olá|obrigado|como|eu sou|tenho|quero|também|português|contratante)\b/.test(text)) return "pt";
  if (/\b(bonjou|mèsi|kijan|mwen|genyen|vle|kreyòl|ayisyen|kontraktè)\b/.test(text)) return "ht";
  return "en";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  pageUrl?: string;
}

interface ChatResponse {
  reply: string;
  intent: string;
  escalate: boolean;
  captureLeadBefore?: boolean;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
}

// ─── Claude call ──────────────────────────────────────────────────────────────

async function callClaude(messages: ChatMessage[], pageUrl?: string): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Build context-aware system addendum based on page URL
  let pageContext = "";
  if (pageUrl) {
    if (pageUrl.includes("/pricing")) {
      pageContext = "\n\n## CURRENT PAGE CONTEXT\nThe user is on the Pricing page. They are actively evaluating plans. Ask the qualifying question about monthly proposal volume immediately — they are ready to buy.";
    } else if (pageUrl.includes("/contractor-apply")) {
      pageContext = "\n\n## CURRENT PAGE CONTEXT\nThe user is on the Contractor Apply page. They are likely a contractor ready to apply. Confirm they have their license and COI, then encourage them to fill out the form on this page.";
    } else if (pageUrl.includes("/why-jobbidder")) {
      pageContext = "\n\n## CURRENT PAGE CONTEXT\nThe user is on the Why Jobbidder page. They are in the consideration phase. Lead with the wholesale savings differentiator and ask how many proposals they send per month.";
    }
  }

  const systemWithContext = SYSTEM_PROMPT + pageContext;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      system: systemWithContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const rawText: string = json?.content?.[0]?.text || "{}";

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      reply: parsed.reply || "I'm not sure how to help with that. Can you rephrase?",
      intent: parsed.intent || "general",
      escalate: parsed.escalate === true,
      captureLeadBefore: parsed.captureLeadBefore === true,
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : undefined,
      ctaLink: parsed.ctaLink?.label && parsed.ctaLink?.href ? parsed.ctaLink : undefined,
    };
  } catch {
    return {
      reply: cleaned.slice(0, 400) || "Sorry, I had trouble processing that. Please try again.",
      intent: "general",
      escalate: false,
    };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),

      POST: async ({ request }) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };

        // Rate limiting
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown";

        if (isRateLimited(ip)) {
          return new Response(
            JSON.stringify({
              reply: "Too many messages. Please wait a moment before trying again.",
              intent: "general",
              escalate: false,
            }),
            { status: 429, headers: corsHeaders }
          );
        }

        try {
          const body: ChatRequest = await request.json();

          if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages array is required" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          // Limit conversation history to last 12 messages to control token usage
          const trimmedMessages = body.messages.slice(-12);
          const lang = detectLanguage(trimmedMessages);

          const result = await callClaude(trimmedMessages, body.pageUrl);

          return new Response(JSON.stringify({ ...result, detectedLanguage: lang }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: any) {
          console.error("[chat API] Error:", err?.message);

          // Detect language from request body for localized error message
          let lang = "en";
          try {
            const body: ChatRequest = await request.clone().json();
            lang = detectLanguage(body.messages || []);
          } catch {}

          return new Response(
            JSON.stringify({
              reply: FALLBACK_REPLIES[lang] || FALLBACK_REPLIES.en,
              intent: "general",
              escalate: false,
            }),
            { status: 200, headers: corsHeaders }
          );
        }
      },
    },
  },
});
