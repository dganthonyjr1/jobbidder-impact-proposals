/**
 * LeadChatWidget — World-class AI chatbot for Jobbidder.io (v3)
 *
 * v3 Fixes:
 * 1. Welcome quick replies re-render dynamically when language changes
 * 2. Error fallback uses proper localized FALLBACK_REPLIES
 * 3. Lead capture posts to /api/public/leads (not support-ticket)
 * 4. Email validation before accepting email step
 * 5. Proactive trigger skips if user already has conversation history
 * 6. Business hours online/offline status (9am–6pm PST Mon–Fri)
 * 7. URLs in Claude replies rendered as clickable links
 * 8. Markdown stripped from Claude replies (no raw asterisks)
 * 9. "New conversation" button in header
 * 10. French (and all language) detection expanded with more patterns
 *
 * A2P compliance note: this widget does NOT collect phone numbers.
 * The GHL LeadConnector widget in <head> handles A2P verification.
 */
import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  text: string;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
  isError?: boolean;
  showSatisfaction?: boolean;
}

interface ApiResponse {
  reply: string;
  intent: string;
  escalate: boolean;
  captureLeadBefore?: boolean;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
  detectedLanguage?: string;
}

type EscalationStep = "idle" | "name" | "email" | "issue" | "submitting" | "done";
type LeadCaptureStep = "idle" | "name" | "email" | "done";

// ─── Multilingual strings ─────────────────────────────────────────────────────

const I18N: Record<string, Record<string, string | ((...args: string[]) => string)>> = {
  en: {
    welcome: "Hi! I'm the Jobbidder AI. I can help you get a proposal, learn about pricing, apply as a contractor, or sign in. What brings you here today?",
    proactive_home: "👋 Have a question about Jobbidder? I can help you get a proposal, check pricing, or apply as a contractor.",
    proactive_pricing: "👋 Questions about our pricing? I can recommend the right plan based on how many proposals you send per month.",
    proactive_contractor: "👋 Ready to join the Jobbidder network? Let me check your eligibility in 30 seconds.",
    proactive_why: "👋 Wondering if Jobbidder is right for you? I can walk you through how it works and what you'd save.",
    q_free_estimate: "Get a free estimate",
    q_see_pricing: "See pricing",
    q_contractor: "I'm a contractor",
    q_signin: "Sign in / Sign up",
    q_how_works: "How does it work?",
    q_objection_expensive: "Is it worth the cost?",
    q_demo: "Book a demo",
    placeholder_default: "Ask me anything…",
    placeholder_name: "Your full name…",
    placeholder_email: "Your email address…",
    placeholder_issue: "Describe the issue…",
    placeholder_submitting: "Submitting…",
    escalation_name_prompt: "I want to get a human on this for you right away. What's your full name?",
    escalation_email_prompt: (name: string) => `Thanks, ${name}. What's your email so our team can follow up?`,
    escalation_issue_prompt: "Got it. Briefly describe what's happening:",
    escalation_submitting: "Creating your support ticket…",
    escalation_done_ok: (name: string, email: string) =>
      `✅ Ticket submitted, ${name}. Our team will reach out to ${email} within 1 business day. Anything else I can help with?`,
    escalation_done_fallback: (name: string, email: string) =>
      `✅ Got it, ${name}. Our team will follow up at ${email} within 1 business day. Anything else I can help with?`,
    lead_name_prompt: "Before I send you over — what's your name?",
    lead_email_prompt: (name: string) => `Nice to meet you, ${name}! What's your email? I'll make sure your account is set up right.`,
    lead_done: (name: string, href: string) =>
      `Perfect, ${name}! Head to ${href} to start your free trial — no credit card needed. You'll be generating proposals in minutes.`,
    satisfaction_prompt: "Was this helpful?",
    satisfaction_yes: "👍 Yes",
    satisfaction_no: "👎 Not really",
    satisfaction_thanks: "Thanks for the feedback! Is there anything else I can help you with?",
    satisfaction_sorry: "Sorry to hear that. Would you like me to connect you with our team?",
    powered_by: "Powered by Jobbidder AI · By chatting you agree to our",
    terms: "Terms",
    header_subtitle: "Proposals · Pricing · Support",
    ticket_submitted: "Support ticket submitted",
    new_conversation: "New conversation",
    online: "Online",
    offline: "Away",
    email_invalid: "Please enter a valid email address.",
    error_fallback: "I'm having trouble connecting right now. Please try again or call us at (310) 987-4997.",
  },
  es: {
    welcome: "¡Hola! Soy el AI de Jobbidder. Puedo ayudarte a obtener una propuesta, conocer los precios, aplicar como contratista o iniciar sesión. ¿En qué te puedo ayudar hoy?",
    proactive_home: "👋 ¿Tienes preguntas sobre Jobbidder? Puedo ayudarte con propuestas, precios o aplicar como contratista.",
    proactive_pricing: "👋 ¿Preguntas sobre nuestros precios? Puedo recomendarte el plan correcto según cuántas propuestas envías por mes.",
    proactive_contractor: "👋 ¿Listo para unirte a la red Jobbidder? Déjame verificar tu elegibilidad en 30 segundos.",
    proactive_why: "👋 ¿Te preguntas si Jobbidder es para ti? Puedo explicarte cómo funciona y cuánto ahorrarías.",
    q_free_estimate: "Obtener estimado gratis",
    q_see_pricing: "Ver precios",
    q_contractor: "Soy contratista",
    q_signin: "Iniciar sesión / Registrarse",
    q_how_works: "¿Cómo funciona?",
    q_objection_expensive: "¿Vale la pena el costo?",
    q_demo: "Reservar una demo",
    placeholder_default: "Pregúntame lo que sea…",
    placeholder_name: "Tu nombre completo…",
    placeholder_email: "Tu correo electrónico…",
    placeholder_issue: "Describe el problema…",
    placeholder_submitting: "Enviando…",
    escalation_name_prompt: "Quiero conectarte con alguien de nuestro equipo de inmediato. ¿Cuál es tu nombre completo?",
    escalation_email_prompt: (name: string) => `Gracias, ${name}. ¿Cuál es tu correo para que nuestro equipo pueda contactarte?`,
    escalation_issue_prompt: "Entendido. Describe brevemente lo que está pasando:",
    escalation_submitting: "Creando tu ticket de soporte…",
    escalation_done_ok: (name: string, email: string) =>
      `✅ Ticket enviado, ${name}. Nuestro equipo se comunicará a ${email} dentro de 1 día hábil. ¿Hay algo más en que pueda ayudarte?`,
    escalation_done_fallback: (name: string, email: string) =>
      `✅ Listo, ${name}. Nuestro equipo te contactará en ${email} dentro de 1 día hábil. ¿Hay algo más?`,
    lead_name_prompt: "Antes de enviarte — ¿cuál es tu nombre?",
    lead_email_prompt: (name: string) => `¡Mucho gusto, ${name}! ¿Cuál es tu correo? Me aseguraré de que tu cuenta quede bien configurada.`,
    lead_done: (name: string, href: string) =>
      `¡Perfecto, ${name}! Ve a ${href} para comenzar tu prueba gratis — sin tarjeta de crédito. Estarás generando propuestas en minutos.`,
    satisfaction_prompt: "¿Fue útil esta conversación?",
    satisfaction_yes: "👍 Sí",
    satisfaction_no: "👎 No mucho",
    satisfaction_thanks: "¡Gracias por tu opinión! ¿Hay algo más en que pueda ayudarte?",
    satisfaction_sorry: "Lo siento. ¿Te gustaría que te conecte con nuestro equipo?",
    powered_by: "Desarrollado por Jobbidder AI · Al chatear aceptas nuestros",
    terms: "Términos",
    header_subtitle: "Propuestas · Precios · Soporte",
    ticket_submitted: "Ticket de soporte enviado",
    new_conversation: "Nueva conversación",
    online: "En línea",
    offline: "No disponible",
    email_invalid: "Por favor ingresa un correo electrónico válido.",
    error_fallback: "Tengo problemas para conectarme ahora mismo. Por favor intenta de nuevo o llámanos al (310) 987-4997.",
  },
  fr: {
    welcome: "Bonjour! Je suis l'IA Jobbidder. Je peux vous aider à obtenir un devis, en savoir plus sur les tarifs, postuler comme entrepreneur ou vous connecter. Que puis-je faire pour vous?",
    proactive_home: "👋 Des questions sur Jobbidder? Je peux vous aider avec des devis, les tarifs ou postuler comme entrepreneur.",
    proactive_pricing: "👋 Des questions sur nos tarifs? Je peux vous recommander le bon forfait selon le nombre de devis que vous envoyez par mois.",
    proactive_contractor: "👋 Prêt à rejoindre le réseau Jobbidder? Laissez-moi vérifier votre éligibilité en 30 secondes.",
    proactive_why: "👋 Vous vous demandez si Jobbidder est fait pour vous? Je peux vous expliquer comment ça fonctionne et ce que vous économiseriez.",
    q_free_estimate: "Obtenir un devis gratuit",
    q_see_pricing: "Voir les tarifs",
    q_contractor: "Je suis entrepreneur",
    q_signin: "Se connecter / S'inscrire",
    q_how_works: "Comment ça fonctionne?",
    q_objection_expensive: "Est-ce que ça vaut le coût?",
    q_demo: "Réserver une démo",
    placeholder_default: "Posez-moi n'importe quelle question…",
    placeholder_name: "Votre nom complet…",
    placeholder_email: "Votre adresse courriel…",
    placeholder_issue: "Décrivez le problème…",
    placeholder_submitting: "Envoi en cours…",
    escalation_name_prompt: "Je veux vous mettre en contact avec quelqu'un de notre équipe immédiatement. Quel est votre nom complet?",
    escalation_email_prompt: (name: string) => `Merci, ${name}. Quel est votre courriel pour que notre équipe puisse vous contacter?`,
    escalation_issue_prompt: "Compris. Décrivez brièvement ce qui se passe:",
    escalation_submitting: "Création de votre ticket de support…",
    escalation_done_ok: (name: string, email: string) =>
      `✅ Ticket soumis, ${name}. Notre équipe vous contactera à ${email} dans 1 jour ouvrable. Puis-je vous aider avec autre chose?`,
    escalation_done_fallback: (name: string, email: string) =>
      `✅ C'est noté, ${name}. Notre équipe vous contactera à ${email} dans 1 jour ouvrable. Autre chose?`,
    lead_name_prompt: "Avant de vous rediriger — quel est votre nom?",
    lead_email_prompt: (name: string) => `Ravi de vous rencontrer, ${name}! Quel est votre courriel? Je m'assurerai que votre compte soit bien configuré.`,
    lead_done: (name: string, href: string) =>
      `Parfait, ${name}! Rendez-vous sur ${href} pour commencer votre essai gratuit — sans carte de crédit. Vous générerez des devis en quelques minutes.`,
    satisfaction_prompt: "Cette conversation vous a-t-elle été utile?",
    satisfaction_yes: "👍 Oui",
    satisfaction_no: "👎 Pas vraiment",
    satisfaction_thanks: "Merci pour votre retour! Puis-je vous aider avec autre chose?",
    satisfaction_sorry: "Je suis désolé. Souhaitez-vous que je vous mette en contact avec notre équipe?",
    powered_by: "Propulsé par Jobbidder AI · En chattant vous acceptez nos",
    terms: "Conditions",
    header_subtitle: "Devis · Tarifs · Support",
    ticket_submitted: "Ticket de support soumis",
    new_conversation: "Nouvelle conversation",
    online: "En ligne",
    offline: "Absent",
    email_invalid: "Veuillez entrer une adresse courriel valide.",
    error_fallback: "J'ai du mal à me connecter en ce moment. Veuillez réessayer ou appelez-nous au (310) 987-4997.",
  },
  pt: {
    welcome: "Olá! Sou o AI do Jobbidder. Posso ajudá-lo a obter uma proposta, conhecer os preços, candidatar-se como contratante ou fazer login. Como posso ajudá-lo hoje?",
    proactive_home: "👋 Tem dúvidas sobre o Jobbidder? Posso ajudá-lo com propostas, preços ou candidatura como contratante.",
    proactive_pricing: "👋 Dúvidas sobre nossos preços? Posso recomendar o plano certo com base em quantas propostas você envia por mês.",
    proactive_contractor: "👋 Pronto para se juntar à rede Jobbidder? Deixe-me verificar sua elegibilidade em 30 segundos.",
    proactive_why: "👋 Perguntando-se se o Jobbidder é para você? Posso explicar como funciona e quanto você economizaria.",
    q_free_estimate: "Obter estimativa gratuita",
    q_see_pricing: "Ver preços",
    q_contractor: "Sou contratante",
    q_signin: "Entrar / Cadastrar",
    q_how_works: "Como funciona?",
    q_objection_expensive: "Vale o custo?",
    q_demo: "Agendar uma demo",
    placeholder_default: "Pergunte-me qualquer coisa…",
    placeholder_name: "Seu nome completo…",
    placeholder_email: "Seu endereço de e-mail…",
    placeholder_issue: "Descreva o problema…",
    placeholder_submitting: "Enviando…",
    escalation_name_prompt: "Quero colocá-lo em contato com alguém da nossa equipe imediatamente. Qual é o seu nome completo?",
    escalation_email_prompt: (name: string) => `Obrigado, ${name}. Qual é o seu e-mail para que nossa equipe possa entrar em contato?`,
    escalation_issue_prompt: "Entendido. Descreva brevemente o que está acontecendo:",
    escalation_submitting: "Criando seu ticket de suporte…",
    escalation_done_ok: (name: string, email: string) =>
      `✅ Ticket enviado, ${name}. Nossa equipe entrará em contato em ${email} dentro de 1 dia útil. Posso ajudá-lo com mais alguma coisa?`,
    escalation_done_fallback: (name: string, email: string) =>
      `✅ Anotado, ${name}. Nossa equipe entrará em contato em ${email} dentro de 1 dia útil. Mais alguma coisa?`,
    lead_name_prompt: "Antes de redirecioná-lo — qual é o seu nome?",
    lead_email_prompt: (name: string) => `Prazer em conhecê-lo, ${name}! Qual é o seu e-mail? Vou garantir que sua conta seja configurada corretamente.`,
    lead_done: (name: string, href: string) =>
      `Perfeito, ${name}! Acesse ${href} para iniciar seu teste gratuito — sem cartão de crédito. Você estará gerando propostas em minutos.`,
    satisfaction_prompt: "Esta conversa foi útil?",
    satisfaction_yes: "👍 Sim",
    satisfaction_no: "👎 Não muito",
    satisfaction_thanks: "Obrigado pelo feedback! Posso ajudá-lo com mais alguma coisa?",
    satisfaction_sorry: "Lamento ouvir isso. Gostaria que eu o colocasse em contato com nossa equipe?",
    powered_by: "Desenvolvido por Jobbidder AI · Ao conversar você concorda com nossos",
    terms: "Termos",
    header_subtitle: "Propostas · Preços · Suporte",
    ticket_submitted: "Ticket de suporte enviado",
    new_conversation: "Nova conversa",
    online: "Online",
    offline: "Ausente",
    email_invalid: "Por favor, insira um endereço de e-mail válido.",
    error_fallback: "Estou com problemas de conexão agora. Por favor tente novamente ou ligue para (310) 987-4997.",
  },
  ht: {
    welcome: "Bonjou! Mwen se AI Jobbidder. Mwen ka ede ou jwenn yon pwopozisyon, aprann sou pri yo, aplike kòm kontraktè, oswa konekte. Ki sa ki mennen ou isit jodi a?",
    proactive_home: "👋 Ou gen kesyon sou Jobbidder? Mwen ka ede ou ak pwopozisyon, pri, oswa aplike kòm kontraktè.",
    proactive_pricing: "👋 Kesyon sou pri nou yo? Mwen ka rekòmande bon plan an selon konbyen pwopozisyon ou voye pa mwa.",
    proactive_contractor: "👋 Prè pou rantre nan rezo Jobbidder? Kite m verifye kalifikasyon ou an 30 segond.",
    proactive_why: "👋 Ap mande si Jobbidder bon pou ou? Mwen ka eksplike kijan li travay ak sa ou ta ekonomize.",
    q_free_estimate: "Jwenn estimasyon gratis",
    q_see_pricing: "Wè pri yo",
    q_contractor: "Mwen se kontraktè",
    q_signin: "Konekte / Enskri",
    q_how_works: "Kijan li travay?",
    q_objection_expensive: "Eske sa vo pri a?",
    q_demo: "Rezève yon demo",
    placeholder_default: "Mande m nenpòt bagay…",
    placeholder_name: "Non konplè ou…",
    placeholder_email: "Adrès imèl ou…",
    placeholder_issue: "Dekri pwoblèm nan…",
    placeholder_submitting: "Ap voye…",
    escalation_name_prompt: "Mwen vle mete ou an kontak ak yon moun nan ekip nou an imedyatman. Ki non konplè ou?",
    escalation_email_prompt: (name: string) => `Mèsi, ${name}. Ki imèl ou pou ekip nou an ka kontakte ou?`,
    escalation_issue_prompt: "Konprann. Dekri brèvman sa k ap pase:",
    escalation_submitting: "Ap kreye tiket sipò ou…",
    escalation_done_ok: (name: string, email: string) =>
      `✅ Tiket soumèt, ${name}. Ekip nou an pral kontakte ou nan ${email} nan 1 jou travay. Eske gen lòt bagay mwen ka ede ou?`,
    escalation_done_fallback: (name: string, email: string) =>
      `✅ Konprann, ${name}. Ekip nou an pral kontakte ou nan ${email} nan 1 jou travay. Lòt bagay?`,
    lead_name_prompt: "Anvan mwen voye ou — ki non ou?",
    lead_email_prompt: (name: string) => `Kontan rankontre ou, ${name}! Ki imèl ou? Mwen pral asire kont ou konfigire kòrèkteman.`,
    lead_done: (name: string, href: string) =>
      `Pafè, ${name}! Ale nan ${href} pou kòmanse eseye gratis ou — pa gen kat kredi. Ou pral jenere pwopozisyon nan kèk minit.`,
    satisfaction_prompt: "Èske konvèsasyon sa a te itil?",
    satisfaction_yes: "👍 Wi",
    satisfaction_no: "👎 Pa vrèman",
    satisfaction_thanks: "Mèsi pou fidbak ou! Eske gen lòt bagay mwen ka ede ou?",
    satisfaction_sorry: "Dezole pou tande sa. Èske ou ta renmen mwen mete ou an kontak ak ekip nou an?",
    powered_by: "Alimenté pa Jobbidder AI · An bavardant ou dakò ak",
    terms: "Tèm",
    header_subtitle: "Pwopozisyon · Pri · Sipò",
    ticket_submitted: "Tiket sipò soumèt",
    new_conversation: "Nouvo konvèsasyon",
    online: "Anliy",
    offline: "Pa disponib",
    email_invalid: "Tanpri antre yon adrès imèl valid.",
    error_fallback: "Mwen gen pwoblèm koneksyon kounye a. Tanpri eseye ankò oswa rele nou nan (310) 987-4997.",
  },
};

function t(lang: string, key: string, ...args: string[]): string {
  const strings = I18N[lang] || I18N.en;
  const val = strings[key] ?? (I18N.en[key] ?? key);
  if (typeof val === "function") return (val as (...a: string[]) => string)(...args);
  return val as string;
}

// ─── Language detection (expanded patterns) ───────────────────────────────────

function detectLangFromText(text: string): string {
  const lower = text.toLowerCase();
  // Spanish — expanded
  if (/\b(hola|gracias|cómo|como|qué|que|necesito|soy|tengo|quiero|también|tambien|español|precio|contratista|buenos|días|dias|buenas|tardes|noches|ayuda|quiero|puedo|puede|cuánto|cuanto|cuál|cual)\b/.test(lower)) return "es";
  // French — expanded (including common contractions and words without accents)
  if (/\b(bonjour|merci|comment|je suis|j'ai|j'ai|je veux|aussi|français|francais|entrepreneur|devis|tarif|bonsoir|salut|oui|non|est-ce|qu'est|quel|quelle|combien|puis-je|pouvez|voulez|avez|nous|vous|ils|elles|mon|ma|mes|votre|vos|leur|leurs|avec|pour|dans|sur|par|mais|donc|car|parce|quand|comment|pourquoi|qui|que|quoi)\b/.test(lower)) return "fr";
  // Portuguese — expanded
  if (/\b(olá|ola|obrigado|obrigada|como|eu sou|tenho|quero|também|tambem|português|portugues|contratante|preço|preco|bom dia|boa tarde|boa noite|sim|não|nao|pode|posso|qual|quanto|onde|quando|porque|para|com|mas|ou|se|que|uma|um|são|sao|está|esta|tem|ter|ser|fazer|ir|vir)\b/.test(lower)) return "pt";
  // Haitian Creole — expanded
  if (/\b(bonjou|mèsi|mesi|kijan|mwen|genyen|vle|kreyòl|kreyol|ayisyen|kontraktè|kontrakте|pri|bonswa|wi|non|ka|pou|nan|ak|ou|li|nou|yo|sa|ki|kote|kilè|poukisa|konbyen|eske|men|avèk|avek)\b/.test(lower)) return "ht";
  return "en";
}

// ─── Business hours check (9am–6pm PST, Mon–Fri) ─────────────────────────────

function isBusinessHours(): boolean {
  try {
    const now = new Date();
    const pst = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const day = pst.getDay(); // 0=Sun, 6=Sat
    const hour = pst.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  } catch {
    return true; // default to online if timezone check fails
  }
}

// ─── Strip markdown from Claude replies ──────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/^#+\s+/gm, "")            // # headings
    .replace(/^[-*]\s+/gm, "• ")        // bullet points → •
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)") // [text](url) → text (url)
    .trim();
}

// ─── Parse URLs in text into clickable segments ───────────────────────────────

function parseTextWithLinks(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline text-primary/80 hover:text-primary break-all"
        >
          {part}
        </a>
      );
    }
    urlRegex.lastIndex = 0;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ─── Email validation ─────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Context-aware proactive message ─────────────────────────────────────────

function getProactiveMessage(lang: string): string {
  if (typeof window === "undefined") return t(lang, "proactive_home");
  const path = window.location.pathname;
  if (path.includes("/pricing")) return t(lang, "proactive_pricing");
  if (path.includes("/contractor-apply")) return t(lang, "proactive_contractor");
  if (path.includes("/why-jobbidder")) return t(lang, "proactive_why");
  return t(lang, "proactive_home");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "jb_chat_session";
const STORAGE_KEY = "jb_chat_messages_v3";
const LANG_KEY = "jb_chat_lang";
const PROACTIVE_KEY = "jb_proactive_shown";
const PROACTIVE_DELAY_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getSessionId(): string {
  if (typeof window === "undefined") return uid();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMessages(msgs: Message[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30)));
  } catch {}
}

function loadLang(): string {
  if (typeof window === "undefined") return "en";
  return sessionStorage.getItem(LANG_KEY) || "en";
}

function saveLang(lang: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LANG_KEY, lang);
}

function buildWelcomeMessage(lang: string): Message {
  return {
    id: "welcome",
    role: "assistant",
    text: t(lang, "welcome"),
    quickReplies: [
      t(lang, "q_free_estimate"),
      t(lang, "q_see_pricing"),
      t(lang, "q_contractor"),
      t(lang, "q_signin"),
    ],
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function submitSupportTicket(data: {
  name: string;
  email: string;
  issue: string;
  sessionId: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/public/support-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function submitLead(data: {
  name: string;
  email: string;
  sessionId: string;
  pageUrl: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadChatWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(true);

  // Escalation state
  const [escalationStep, setEscalationStep] = useState<EscalationStep>("idle");
  const [escalationData, setEscalationData] = useState<{ name?: string; email?: string }>({});

  // Lead capture state
  const [leadCaptureStep, setLeadCaptureStep] = useState<LeadCaptureStep>("idle");
  const [leadData, setLeadData] = useState<{ name?: string; pendingHref?: string }>({});

  // Satisfaction state
  const [satisfactionGiven, setSatisfactionGiven] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>("");
  const proactiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    sessionId.current = getSessionId();
    const savedLang = loadLang();
    setLang(savedLang);
    setOnline(isBusinessHours());

    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([buildWelcomeMessage(savedLang)]);
    }

    // Proactive trigger — only if no existing conversation
    const alreadyShown = sessionStorage.getItem(PROACTIVE_KEY);
    if (!alreadyShown) {
      proactiveTimer.current = setTimeout(() => {
        setMessages((prev) => {
          // Fix #5: skip if user already has a conversation (more than just welcome)
          if (prev.length > 1) return prev;
          const currentLang = loadLang();
          const proactiveMsg: Message = {
            id: uid(),
            role: "assistant",
            text: getProactiveMessage(currentLang),
            quickReplies: [
              t(currentLang, "q_free_estimate"),
              t(currentLang, "q_see_pricing"),
              t(currentLang, "q_contractor"),
            ],
          };
          sessionStorage.setItem(PROACTIVE_KEY, "1");
          setUnread((n) => n + 1);
          return [...prev, proactiveMsg];
        });
      }, PROACTIVE_DELAY_MS);
    }

    return () => {
      if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    };
  }, []);

  // ── Scroll ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  // ── Unread badge ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        setUnread((n) => n + 1);
      }
    }
  }, [messages]);

  // ── Persist ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: uid() }]);
  }, []);

  const updateLang = useCallback((newLang: string) => {
    setLang(newLang);
    saveLang(newLang);
    // Fix #1: re-render welcome message quick replies in new language
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome"
          ? { ...m, text: t(newLang, "welcome"), quickReplies: [
              t(newLang, "q_free_estimate"),
              t(newLang, "q_see_pricing"),
              t(newLang, "q_contractor"),
              t(newLang, "q_signin"),
            ]}
          : m
      )
    );
  }, []);

  // ── New conversation ─────────────────────────────────────────────────────────

  const handleNewConversation = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(PROACTIVE_KEY);
    }
    sessionId.current = getSessionId();
    setMessages([buildWelcomeMessage(lang)]);
    setEscalationStep("idle");
    setEscalationData({});
    setLeadCaptureStep("idle");
    setLeadData({});
    setSatisfactionGiven(false);
    setInput("");
  }, [lang]);

  // ── API call ─────────────────────────────────────────────────────────────────

  const sendToApi = useCallback(
    async (userText: string, history: Message[]) => {
      setLoading(true);
      try {
        const apiMessages = history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.text }));
        apiMessages.push({ role: "user", content: userText });

        const res = await fetch("/api/public/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: sessionId.current,
            pageUrl: typeof window !== "undefined" ? window.location.href : "",
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ApiResponse = await res.json();

        // Fix #1: update lang from API response and re-render welcome quick replies
        const newLang = data.detectedLanguage || lang;
        if (newLang !== lang) {
          updateLang(newLang);
        }

        const activeLang = newLang;

        if (data.escalate && escalationStep === "idle") {
          setEscalationStep("name");
          addMessage({ role: "assistant", text: t(activeLang, "escalation_name_prompt") });
        } else if (data.captureLeadBefore && leadCaptureStep === "idle") {
          setLeadCaptureStep("name");
          setLeadData({ pendingHref: data.ctaLink?.href || "https://www.jobbidder.io/login" });
          addMessage({ role: "assistant", text: t(activeLang, "lead_name_prompt") });
        } else {
          // Fix #8: strip markdown from reply
          const cleanReply = stripMarkdown(data.reply);
          addMessage({
            role: "assistant",
            text: cleanReply,
            quickReplies: data.quickReplies,
            ctaLink: data.ctaLink,
          });
        }
      } catch {
        // Fix #2: use proper localized error fallback
        addMessage({
          role: "assistant",
          text: t(lang, "error_fallback"),
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    },
    [escalationStep, leadCaptureStep, lang, addMessage, updateLang]
  );

  // ── Escalation flow ──────────────────────────────────────────────────────────

  const handleEscalationInput = useCallback(
    async (val: string) => {
      addMessage({ role: "user", text: val });

      if (escalationStep === "name") {
        setEscalationData((d) => ({ ...d, name: val }));
        setEscalationStep("email");
        setTimeout(() => addMessage({ role: "assistant", text: t(lang, "escalation_email_prompt", val.split(" ")[0] || val) }), 300);
      } else if (escalationStep === "email") {
        // Fix #4: validate email
        if (!isValidEmail(val)) {
          setTimeout(() => addMessage({ role: "assistant", text: t(lang, "email_invalid"), isError: true }), 200);
          return;
        }
        setEscalationData((d) => ({ ...d, email: val }));
        setEscalationStep("issue");
        setTimeout(() => addMessage({ role: "assistant", text: t(lang, "escalation_issue_prompt") }), 300);
      } else if (escalationStep === "issue") {
        const finalData = { ...escalationData, issue: val };
        setEscalationStep("submitting");
        setTimeout(() => addMessage({ role: "assistant", text: t(lang, "escalation_submitting") }), 300);

        const ok = await submitSupportTicket({
          name: finalData.name || "Unknown",
          email: finalData.email || "Unknown",
          issue: val,
          sessionId: sessionId.current,
        });

        setEscalationStep("done");
        const firstName = finalData.name?.split(" ")[0] || "there";
        const email = finalData.email || "";
        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: ok
                ? t(lang, "escalation_done_ok", firstName, email)
                : t(lang, "escalation_done_fallback", firstName, email),
              quickReplies: [t(lang, "q_see_pricing"), t(lang, "q_free_estimate"), t(lang, "q_contractor")],
              showSatisfaction: true,
            }),
          500
        );
      }
    },
    [escalationStep, escalationData, lang, addMessage]
  );

  // ── Lead capture flow ────────────────────────────────────────────────────────

  const handleLeadCaptureInput = useCallback(
    async (val: string) => {
      addMessage({ role: "user", text: val });

      if (leadCaptureStep === "name") {
        setLeadData((d) => ({ ...d, name: val }));
        setLeadCaptureStep("email");
        setTimeout(() => addMessage({ role: "assistant", text: t(lang, "lead_email_prompt", val.split(" ")[0] || val) }), 300);
      } else if (leadCaptureStep === "email") {
        // Fix #4: validate email
        if (!isValidEmail(val)) {
          setTimeout(() => addMessage({ role: "assistant", text: t(lang, "email_invalid"), isError: true }), 200);
          return;
        }
        const finalData = { ...leadData, email: val };
        setLeadCaptureStep("done");

        // Fix #3: post to /api/public/leads (not support-ticket)
        submitLead({
          name: finalData.name || "Unknown",
          email: val,
          sessionId: sessionId.current,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        });

        const href = finalData.pendingHref || "https://www.jobbidder.io/login";
        const firstName = finalData.name?.split(" ")[0] || "there";
        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: t(lang, "lead_done", firstName, href),
              ctaLink: { label: t(lang, "q_signin"), href },
            }),
          400
        );
      }
    },
    [leadCaptureStep, leadData, lang, addMessage]
  );

  // ── Main send handler ────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const val = (text ?? input).trim();
      if (!val || loading) return;
      setInput("");

      // Fix #10: detect language from user input and update UI immediately
      const detectedLang = detectLangFromText(val);
      if (detectedLang !== "en" && detectedLang !== lang) {
        updateLang(detectedLang);
      }

      if (escalationStep !== "idle" && escalationStep !== "done") {
        await handleEscalationInput(val);
        return;
      }

      if (leadCaptureStep !== "idle" && leadCaptureStep !== "done") {
        await handleLeadCaptureInput(val);
        return;
      }

      addMessage({ role: "user", text: val });
      await sendToApi(val, messages);
    },
    [input, loading, escalationStep, leadCaptureStep, lang, handleEscalationInput, handleLeadCaptureInput, addMessage, sendToApi, messages, updateLang]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Satisfaction handler ─────────────────────────────────────────────────────

  const handleSatisfaction = useCallback(
    (positive: boolean) => {
      setSatisfactionGiven(true);
      setTimeout(
        () =>
          addMessage({
            role: "assistant",
            text: positive ? t(lang, "satisfaction_thanks") : t(lang, "satisfaction_sorry"),
            quickReplies: positive
              ? [t(lang, "q_see_pricing"), t(lang, "q_free_estimate")]
              : undefined,
          }),
        200
      );
    },
    [lang, addMessage]
  );

  // ── Placeholder ──────────────────────────────────────────────────────────────

  const getPlaceholder = () => {
    if (escalationStep === "name" || leadCaptureStep === "name") return t(lang, "placeholder_name");
    if (escalationStep === "email" || leadCaptureStep === "email") return t(lang, "placeholder_email");
    if (escalationStep === "issue") return t(lang, "placeholder_issue");
    if (escalationStep === "submitting") return t(lang, "placeholder_submitting");
    return t(lang, "placeholder_default");
  };

  const isInputDisabled = escalationStep === "submitting" || loading;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Launcher button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-95"
        aria-label={open ? "Close chat" : "Open Jobbidder AI chat"}
      >
        <span
          className="absolute inset-0 flex items-center justify-center transition-all duration-200"
          style={{ opacity: open ? 0 : 1, transform: open ? "scale(0.7) rotate(90deg)" : "scale(1) rotate(0deg)" }}
        >
          <MessageCircle className="h-6 w-6" />
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center transition-all duration-200"
          style={{ opacity: open ? 1 : 0, transform: open ? "scale(1) rotate(0deg)" : "scale(0.7) rotate(-90deg)" }}
        >
          <ChevronDown className="h-6 w-6" />
        </span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Chat panel ── */}
      <div
        className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 origin-bottom-right"
        style={{
          width: "min(380px, calc(100vw - 1.5rem))",
          maxHeight: "min(560px, calc(100vh - 8rem))",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
          pointerEvents: open ? "auto" : "none",
        }}
        role="dialog"
        aria-label="Jobbidder AI Assistant"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-primary px-4 py-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight">Jobbidder AI</p>
            <p className="text-xs text-white/70 leading-tight">{t(lang, "header_subtitle")}</p>
          </div>
          {/* Fix #6: business hours online/offline indicator */}
          <div className="flex items-center gap-1.5 mr-1">
            <span
              className={`h-2 w-2 rounded-full ${online ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)]" : "bg-yellow-400"}`}
            />
            <span className="text-[10px] text-white/60">{t(lang, online ? "online" : "offline")}</span>
          </div>
          {/* Fix #9: New conversation button */}
          <button
            onClick={handleNewConversation}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition"
            aria-label={t(lang, "new_conversation")}
            title={t(lang, "new_conversation")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3 overflow-y-auto p-4 flex-1" style={{ minHeight: "200px" }}>
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : m.isError
                    ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {m.isError && <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                {/* Fix #7: render URLs as clickable links */}
                {parseTextWithLinks(m.text)}
              </div>

              {/* CTA Link */}
              {m.ctaLink && (
                <a
                  href={m.ctaLink.href}
                  target={m.ctaLink.href.startsWith("http") ? "_blank" : "_self"}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                >
                  {m.ctaLink.label}
                  {m.ctaLink.href.startsWith("http") && <ExternalLink className="h-3.5 w-3.5 opacity-70" />}
                </a>
              )}

              {/* Quick replies */}
              {m.quickReplies && m.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                  {m.quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => handleSend(qr)}
                      disabled={loading}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:opacity-50"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              {/* Satisfaction prompt */}
              {m.showSatisfaction && !satisfactionGiven && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{t(lang, "satisfaction_prompt")}</span>
                  <button
                    onClick={() => handleSatisfaction(true)}
                    className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {t(lang, "satisfaction_yes")}
                  </button>
                  <button
                    onClick={() => handleSatisfaction(false)}
                    className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    {t(lang, "satisfaction_no")}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Animated typing indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:160ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:320ms]" />
              </div>
            </div>
          )}

          {/* Escalation done state */}
          {escalationStep === "done" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t(lang, "ticket_submitted")}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border px-3 py-3 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isInputDisabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:opacity-40 active:scale-95"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        {/* Footer */}
        <div className="rounded-b-2xl border-t border-border/50 px-4 py-2 text-center shrink-0">
          <p className="text-[10px] text-muted-foreground/60">
            {t(lang, "powered_by")}{" "}
            <a href="/terms" className="underline hover:text-muted-foreground transition">
              {t(lang, "terms")}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
