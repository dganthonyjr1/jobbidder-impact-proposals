import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/chat
 *
 * World-class AI chatbot endpoint for Jobbidder.io
 * Powered by Claude with full product knowledge base.
 *
 * Request body:
 *   { messages: { role: "user"|"assistant", content: string }[], sessionId?: string }
 *
 * Response:
 *   {
 *     reply: string,
 *     intent: "general"|"pricing"|"signup"|"contractor"|"support"|"proposal",
 *     escalate: boolean,
 *     quickReplies?: string[],
 *     ctaLink?: { label: string, href: string }
 *   }
 */

const SYSTEM_PROMPT = `You are the Jobbidder AI Assistant — a sharp, knowledgeable, and genuinely helpful guide for Jobbidder.io. You speak with confidence and warmth. You are NOT a generic chatbot; you know this product inside and out.

## ABOUT JOBBIDDER
Jobbidder is an AI-powered proposal and estimate platform for contractors, built by Sudden Impact Agency. It turns AI intake calls into professional Good/Better/Best proposals with itemized materials, labor, and one-click client acceptance — in English, Spanish, French, Portuguese, and Haitian Creole. Tagline: "From voice call to signed proposal in 60 seconds."

## KEY VALUE PROPS
- AI generates Good/Better/Best proposals in 60 seconds from a voice intake call
- Wholesale (SIA) pricing saves clients $1,500+ per job vs. retail
- Proposals include itemized materials, labor, scope, e-signature link, and public share link
- 5 languages: English, Español, Français, Português, Kreyòl Ayisyen
- GoHighLevel (GHL) CRM two-way sync
- AI Proposal Agent phone: (310) 987-4997

## PRICING TIERS
**Apprentice — FREE** (no credit card)
- 1 full AI intake call (up to 15 min), 1 AI-generated proposal, Good/Better/Best tiers, SMS & email delivery, public share link
- Sign up: https://www.jobbidder.io/login

**Journeyman — $497/mo + $497 setup**
- Unlimited AI proposals, full materials catalog, wholesale pricing access, SMS & email delivery, client e-signatures
- Sign up: https://link.suddenimpactagency.io/payment-link/6a402a42390a6e280643af94

**Master GC — $997/mo + $997 setup**
- Everything in Journeyman + 500 AI credits/mo, AI voice prequal calls, license & insurance verification, white-label branding, unlimited contractors, team management dashboard
- Sign up: https://link.suddenimpactagency.io/payment-link/6a402ae09b12592b36824ddb

**Principal — $1,997/mo + $1,997 setup**
- Everything in Master GC + 2,000 AI credits/mo, document renewal alerts, priority AI voice, all future features, white-glove onboarding, dedicated support line, SLA guarantee
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
3. Examples: "I can't log in", "my payment failed", "I was charged wrong", "my proposal isn't sending", "I need to cancel"

Set "escalate": false for ALL general questions, pricing questions, sign-up help, contractor questions, and proposal requests — even if they seem frustrated.

## CONTRACTOR PRE-SCREENING
When a user identifies as a contractor wanting to join:
1. Ask if they are licensed (have a contractor's license)
2. Ask if they have a current Certificate of Insurance (COI)
3. If YES to both → route them to https://www.jobbidder.io/contractor-apply
4. If NO to either → explain the requirements warmly but clearly: "We require both a valid contractor's license and a current COI to protect our clients. Once you have those, we'd love to have you."

## PROPOSAL INTAKE (CLIENT FLOW)
When a user wants a proposal/estimate for a job:
- Explain they can get a free Good/Better/Best proposal in 60 seconds
- Route them to sign up free at https://www.jobbidder.io/login OR call (310) 987-4997 to speak with the AI Proposal Agent directly
- Mention the $1,500+ wholesale savings

## RESPONSE STYLE
- Be concise but complete. No filler phrases like "Great question!" or "Absolutely!"
- Use plain language. No jargon.
- When routing, always provide the actual URL as a clickable link.
- Keep responses under 120 words unless the user asks for detail.
- Be direct. If someone asks "how do I sign up?" just tell them the URL immediately.

## OUTPUT FORMAT — MANDATORY
You MUST respond with ONLY a valid JSON object. No markdown, no code fences, no extra text. Schema:
{
  "reply": "Your response text here (plain text, no markdown)",
  "intent": "general|pricing|signup|contractor|support|proposal",
  "escalate": false,
  "quickReplies": ["optional", "array", "of", "suggestions"],
  "ctaLink": { "label": "Button label", "href": "https://..." }
}

The "ctaLink" field is optional — only include it when there is a clear primary action (sign up, apply, view pricing). Omit it for general conversation.
The "quickReplies" field is optional — include 2-3 short follow-up options when helpful. Omit for support/escalation flows.
`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

interface ChatResponse {
  reply: string;
  intent: string;
  escalate: boolean;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
}

async function callClaude(messages: ChatMessage[]): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
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
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : undefined,
      ctaLink: parsed.ctaLink?.label && parsed.ctaLink?.href ? parsed.ctaLink : undefined,
    };
  } catch {
    // Fallback: treat the raw text as a plain reply
    return {
      reply: cleaned.slice(0, 300) || "Sorry, I had trouble processing that. Please try again.",
      intent: "general",
      escalate: false,
    };
  }
}

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

        try {
          const body: ChatRequest = await request.json();

          if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages array is required" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          // Limit conversation history to last 10 messages to control token usage
          const trimmedMessages = body.messages.slice(-10);

          const result = await callClaude(trimmedMessages);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: any) {
          console.error("[chat API] Error:", err?.message);
          return new Response(
            JSON.stringify({
              reply: "I'm having trouble connecting right now. Please try again in a moment or call us at (310) 987-4997.",
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
