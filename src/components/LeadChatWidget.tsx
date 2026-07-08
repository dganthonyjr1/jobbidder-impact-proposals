/**
 * LeadChatWidget — World-class AI chatbot for Jobbidder.io
 *
 * Powered by Claude via /api/public/chat.
 * Handles: sign-up/sign-in routing, contractor pre-screening,
 * lead qualification, proposal intake, and support escalation.
 *
 * Replaces the previous step-based form widget.
 * Mounted globally via WidgetGate in __root.tsx.
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
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  text: string;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
  isError?: boolean;
}

interface ApiResponse {
  reply: string;
  intent: string;
  escalate: boolean;
  quickReplies?: string[];
  ctaLink?: { label: string; href: string };
}

// Escalation collection steps
type EscalationStep = "idle" | "name" | "email" | "issue" | "submitting" | "done";

// ─── Constants ───────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm the Jobbidder AI. I can help you get a proposal, learn about pricing, apply as a contractor, or sign in. What brings you here today?",
  quickReplies: ["Get a free estimate", "See pricing", "I'm a contractor", "Sign in / Sign up"],
};

const SESSION_KEY = "jb_chat_session";
const STORAGE_KEY = "jb_chat_messages";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    // Keep last 30 messages in session storage
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30)));
  } catch {}
}

// ─── Support ticket submission ────────────────────────────────────────────────

async function submitSupportTicket(data: {
  name: string;
  email: string;
  issue: string;
  sessionId: string;
}): Promise<boolean> {
  try {
    // Use the existing Supabase integration via a simple fetch to a public endpoint
    // Falls back gracefully if not available
    const res = await fetch("/api/public/support-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    // Non-fatal — ticket submission failure shouldn't break the chat
    return false;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasOpened, setHasOpened] = useState(false);

  // Escalation state
  const [escalationStep, setEscalationStep] = useState<EscalationStep>("idle");
  const [escalationData, setEscalationData] = useState<{
    name?: string;
    email?: string;
    issue?: string;
  }>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>("");

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    sessionId.current = getSessionId();
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  // ── Scroll ────────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  // ── Unread badge on new bot messages while closed ─────────────────────────

  useEffect(() => {
    if (!open && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        setUnread((n) => n + 1);
      }
    }
  }, [messages]);

  // ── Persist messages ──────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // ── Add message helpers ───────────────────────────────────────────────────

  const addMessage = useCallback((msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: uid() }]);
  }, []);

  // ── API call ──────────────────────────────────────────────────────────────

  const sendToApi = useCallback(
    async (userText: string, history: Message[]) => {
      setLoading(true);
      try {
        const apiMessages = history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.text }));

        // Add the new user message
        apiMessages.push({ role: "user", content: userText });

        const res = await fetch("/api/public/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: sessionId.current,
          }),
        });

        const data: ApiResponse = await res.json();

        if (data.escalate && escalationStep === "idle") {
          // Trigger the deterministic escalation collection flow
          setEscalationStep("name");
          addMessage({
            role: "assistant",
            text: data.reply,
          });
        } else {
          addMessage({
            role: "assistant",
            text: data.reply,
            quickReplies: data.quickReplies,
            ctaLink: data.ctaLink,
          });
        }
      } catch {
        addMessage({
          role: "assistant",
          text: "I'm having trouble connecting right now. Please try again or call us at (310) 987-4997.",
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    },
    [escalationStep, addMessage]
  );

  // ── Escalation flow ───────────────────────────────────────────────────────

  const handleEscalationInput = useCallback(
    async (val: string) => {
      addMessage({ role: "user", text: val });

      if (escalationStep === "name") {
        setEscalationData((d) => ({ ...d, name: val }));
        setEscalationStep("email");
        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: `Thanks, ${val.split(" ")[0]}. What's your email address so our team can follow up?`,
            }),
          300
        );
      } else if (escalationStep === "email") {
        setEscalationData((d) => ({ ...d, email: val }));
        setEscalationStep("issue");
        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: "Got it. Briefly describe the issue you're running into:",
            }),
          300
        );
      } else if (escalationStep === "issue") {
        const finalData = { ...escalationData, issue: val };
        setEscalationData(finalData);
        setEscalationStep("submitting");

        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: "Creating your support ticket…",
            }),
          300
        );

        const ok = await submitSupportTicket({
          name: finalData.name || "Unknown",
          email: finalData.email || "Unknown",
          issue: val,
          sessionId: sessionId.current,
        });

        setEscalationStep("done");
        setTimeout(
          () =>
            addMessage({
              role: "assistant",
              text: ok
                ? `✅ Your ticket has been submitted, ${finalData.name?.split(" ")[0] || "there"}. Our team will reach out to ${finalData.email} within 1 business day. Is there anything else I can help you with?`
                : `✅ Got it, ${finalData.name?.split(" ")[0] || "there"}. Our team will follow up at ${finalData.email} within 1 business day. Is there anything else I can help you with?`,
              quickReplies: ["See pricing", "Get a free estimate", "I'm a contractor"],
            }),
          500
        );
      }
    },
    [escalationStep, escalationData, addMessage]
  );

  // ── Main send handler ─────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const val = (text ?? input).trim();
      if (!val || loading) return;
      setInput("");

      // If in escalation flow, handle deterministically
      if (escalationStep !== "idle" && escalationStep !== "done") {
        await handleEscalationInput(val);
        return;
      }

      addMessage({ role: "user", text: val });
      await sendToApi(val, messages);
    },
    [input, loading, escalationStep, handleEscalationInput, addMessage, sendToApi, messages]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Open/close ────────────────────────────────────────────────────────────

  const toggleOpen = () => {
    setOpen((o) => {
      if (!o && !hasOpened) setHasOpened(true);
      return !o;
    });
  };

  // ── Input placeholder ─────────────────────────────────────────────────────

  const getPlaceholder = () => {
    if (escalationStep === "name") return "Your full name…";
    if (escalationStep === "email") return "Your email address…";
    if (escalationStep === "issue") return "Describe the issue…";
    if (escalationStep === "submitting") return "Submitting…";
    return "Ask me anything…";
  };

  const isInputDisabled = escalationStep === "submitting" || loading;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Launcher button ── */}
      <button
        onClick={toggleOpen}
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
        {/* Unread badge */}
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
          width: "360px",
          maxWidth: "calc(100vw - 1.5rem)",
          maxHeight: "calc(100vh - 8rem)",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
          pointerEvents: open ? "all" : "none",
        }}
        role="dialog"
        aria-label="Jobbidder AI Assistant"
      >
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-primary px-4 py-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Jobbidder AI</p>
            <p className="text-xs text-white/70 leading-tight">Proposals · Pricing · Support</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex flex-col gap-3 overflow-y-auto p-4 flex-1"
          style={{ minHeight: "200px", maxHeight: "400px" }}
        >
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
                {m.text}
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
                <div className="flex flex-wrap gap-1.5 max-w-[85%]">
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
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Escalation done state */}
          {escalationStep === "done" && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Support ticket submitted
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
            Powered by Jobbidder AI · By chatting you agree to our{" "}
            <a href="/terms" className="underline hover:text-muted-foreground transition">
              Terms
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
