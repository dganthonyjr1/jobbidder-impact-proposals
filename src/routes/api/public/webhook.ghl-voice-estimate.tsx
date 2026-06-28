/**
 * POST /api/public/webhook/ghl-voice-estimate
 *
 * GHL Voice AI fires this after collecting homeowner info on a call.
 * Generates an AI-powered estimate/proposal in the homeowner's language
 * and sends it via email + SMS — no human needed.
 *
 * Required GHL webhook fields:
 *   contractor_slug  — which contractor's pricing/branding to use
 *   client_name      — homeowner name
 *   client_email     — homeowner email
 *   phone            — homeowner phone
 *   job_address      — property address
 *   trade_type       — e.g. "roofing", "flooring", "plumbing"
 *   job_description  — what the homeowner described on the call
 *   language         — en|es|fr|pt|ht (default: en)
 */
import { createFileRoute } from "@tanstack/react-router";

const SUPPORTED_LANGS = ["en", "es", "fr", "pt", "ht"] as const;
type Lang = typeof SUPPORTED_LANGS[number];

function resolveLang(raw?: string | null): Lang {
  const l = (raw || "").toLowerCase().slice(0, 2);
  return (SUPPORTED_LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

const ESTIMATE_SMS: Record<Lang, (name: string, url: string, biz: string) => string> = {
  en: (n, u, b) => `Hi ${n}! ${b} prepared your estimate. View and e-sign here: ${u}`,
  es: (n, u, b) => `¡Hola ${n}! ${b} preparó tu estimado. Véelo y fírmalo aquí: ${u}`,
  fr: (n, u, b) => `Bonjour ${n} ! ${b} a préparé votre devis. Consultez-le et signez ici : ${u}`,
  pt: (n, u, b) => `Olá ${n}! ${b} preparou seu orçamento. Veja e assine aqui: ${u}`,
  ht: (n, u, b) => `Bonjou ${n}! ${b} prepare estimasyon ou. Gade epi siyen la: ${u}`,
};

export const Route = createFileRoute("/api/public/webhook/ghl-voice-estimate")({
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
        let body: Record<string, any>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // GHL can deliver fields flat, or nested under containers like
        // customData / custom_data / contact / call / data. Merge them all into
        // one flat view so a value is found no matter how GHL structured it.
        const containers = [
          body,
          body?.customData,
          body?.custom_data,
          body?.customFields,
          body?.data,
          body?.contact,
          body?.call,
        ].filter((c) => c && typeof c === "object");
        const merged: Record<string, any> = Object.assign({}, ...containers);

        // Pull the first non-empty value across every plausible key name.
        const pick = (...keys: string[]): string => {
          for (const k of keys) {
            const v = merged[k] ?? body?.[k];
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
          }
          return "";
        };

        const slug: string = pick("contractor_slug", "contractorSlug", "slug", "contractor", "contractor_slu");
        const clientName: string =
          pick("client_name", "clientName", "customer_name", "customerName", "name", "full_name", "fullName") ||
          [pick("first_name", "firstName"), pick("last_name", "lastName")].filter(Boolean).join(" ").trim();
        const clientEmail: string = pick("client_email", "clientEmail", "customer_email", "email");
        const clientPhone: string = pick("phone", "client_phone", "clientPhone", "customer_phone", "phone_number", "phoneNumber");
        const jobAddress: string = pick("job_address", "jobAddress", "address", "full_address", "address1");
        const tradeType: string = pick("trade_type", "tradeType", "trade", "service", "service_type");
        const jobDescription: string = pick(
          "job_description", "jobDescription", "job_descriptio",
          "description", "notes", "message",
          "call_summary", "callSummary", "summary",
          "call_transcript", "callTranscript", "transcript",
        );
        const rawLang = pick("language", "lang", "locale") || null;
        const language: Lang = resolveLang(rawLang);

        // Validate minimum required fields
        const missing: string[] = [];
        if (!slug) missing.push("contractor_slug");
        if (!clientName) missing.push("client_name");
        if (!clientEmail && !clientPhone) missing.push("client_email or phone");
        if (!jobDescription || jobDescription.length < 10) missing.push("job_description (min 10 chars)");

        if (missing.length) {
          // Echo back exactly what GHL sent so the GHL execution log shows the
          // real payload structure — no guessing about field names.
          const redact = (v: any) => {
            const s = typeof v === "string" ? v : JSON.stringify(v);
            return s.length > 120 ? s.slice(0, 117) + "…" : s;
          };
          const received: Record<string, string> = {};
          for (const c of containers) {
            for (const [k, v] of Object.entries(c)) {
              if (!(k in received)) received[k] = redact(v);
            }
          }
          return Response.json(
            {
              error: "Missing required fields",
              missing,
              received_keys: Object.keys(received),
              received,
              got: { slug, clientName, clientEmail, clientPhone, jobDescription_len: jobDescription.length },
            },
            { status: 400 },
          );
        }

        // Call intake-submit to generate the AI proposal
        const origin = new URL(request.url).origin;
        const intakeRes = await fetch(`${origin}/api/public/intake-submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            client_name: clientName,
            client_email: clientEmail || `voice-noreply+${Date.now()}@jobbidder.io`,
            client_phone: clientPhone || "",
            job_address: jobAddress || null,
            trade_type: tradeType || null,
            job_description: jobDescription,
            language,
            photos: [],
          }),
        });

        const intakeData: any = await intakeRes.json().catch(() => ({}));

        if (!intakeRes.ok || !intakeData.success) {
          const err = intakeData.error || `intake-submit failed (${intakeRes.status})`;
          console.error("[voice-estimate] intake failed:", err);
          return Response.json({ error: err, detail: intakeData }, { status: 502 });
        }

        const proposalUrl: string = intakeData.proposal_url;
        const proposalNumber: string = intakeData.proposal_number;

        // Send SMS if phone provided (email is already sent by intake-submit)
        let smsSent = false;
        if (clientPhone) {
          try {
            const { sendSmsViaGHL } = await import("@/lib/ghl.server");
            const biz = slug; // fallback; intake-submit already sent branded email
            const smsBody = ESTIMATE_SMS[language](clientName.split(" ")[0], proposalUrl, biz);
            const smsRes = await sendSmsViaGHL({
              to: clientPhone,
              body: smsBody,
              contactName: clientName,
              contactEmail: clientEmail || undefined,
              language,
              tags: ["jobbidder", "voice-estimate"],
            });
            smsSent = smsRes.ok;
            if (!smsRes.ok) console.warn("[voice-estimate] SMS failed:", (smsRes as any).error);
          } catch (e: any) {
            console.warn("[voice-estimate] SMS error:", e?.message);
          }
        }

        return Response.json({
          success: true,
          proposal_id: intakeData.proposal_id,
          proposal_number: proposalNumber,
          proposal_url: proposalUrl,
          language,
          sms_sent: smsSent,
          email_sent: !!clientEmail,
        });
      },
    },
  },
});
