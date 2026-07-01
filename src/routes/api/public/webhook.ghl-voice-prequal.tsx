/**
 * POST /api/public/webhook/ghl-voice-prequal
 *
 * GHL fires this webhook at the end of the "Jessica - Voice Pre-Qual" call.
 * Records the result, links to any existing contractor application, and sends
 * an upload-link SMS in the caller's language — all before a human is involved.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL } from "@/lib/ghl.server";

const SUPPORTED_LANGS = ["en", "es", "fr", "pt", "ht"] as const;
type Lang = typeof SUPPORTED_LANGS[number];

const PREQUAL_SMS: Record<Lang, (name: string, url: string) => string> = {
  en: (n, u) => `Hi ${n}! Thanks for speaking with NGS. To complete your contractor pre-qualification, please upload your license, insurance, and bonding documents — it only takes 5 minutes: ${u} Reply STOP to opt out.`,
  es: (n, u) => `¡Hola ${n}! Gracias por hablar con NGS. Para completar tu precalificación como contratista, por favor sube tu licencia, seguro y documentos de fianza — solo tarda 5 minutos: ${u} Responde STOP para cancelar.`,
  fr: (n, u) => `Bonjour ${n} ! Merci d'avoir parlé avec NGS. Pour finaliser votre pré-qualification, veuillez télécharger votre licence, votre assurance et vos documents de caution — cela ne prend que 5 minutes : ${u} Répondez STOP pour vous désabonner.`,
  pt: (n, u) => `Olá ${n}! Obrigado por falar com a NGS. Para concluir sua pré-qualificação como contratante, envie sua licença, seguro e documentos de fiança — leva apenas 5 minutos: ${u} Responda STOP para cancelar.`,
  ht: (n, u) => `Bonjou ${n}! Mèsi pou pale ak NGS. Pou w konplete pre-kalifikasyon kontraktè ou, tanpri telechaje lisans ou, asirans ou, ak dokiman garanti ou — sa pran sèlman 5 minit: ${u} Reponn STOP pou w sispann.`,
};

function resolveLang(raw?: string | null): Lang {
  const l = (raw || "").toLowerCase().slice(0, 2);
  return (SUPPORTED_LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

function ghlCreds() {
  return {
    apiToken:   process.env.GHL_API_TOKEN!,
    locationId: process.env.GHL_LOCATION_ID!,
    fromNumber: process.env.GHL_FROM_NUMBER!,
  };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

export const Route = createFileRoute("/api/public/webhook/ghl-voice-prequal")({
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

        const rawPhone = body.phone ?? body.contact?.phone ?? "";
        if (!rawPhone) return Response.json({ error: "phone required" }, { status: 400 });

        const phone = normalizePhone(String(rawPhone));
        const ghlContactId: string | null = body.contact_id ?? body.contact?.id ?? null;
        const disposition: string = body.disposition ?? body.call_disposition ?? "unknown";
        const answers = body.survey_answers ?? body.custom_fields ?? body.customFields ?? {};

        const rawLang = body.language ?? body.contact?.language ?? answers.language ?? answers.lang ?? null;
        const lang = resolveLang(rawLang);

        const { data: existing } = await supabaseAdmin
          .from("contractor_applications")
          .select("id, name")
          .eq("phone", phone)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: callRow } = await supabaseAdmin.from("voice_prequal_calls").insert({
          contractor_id:     existing?.id ?? null,
          phone,
          ghl_contact_id:    ghlContactId,
          call_disposition:  ["qualified","not_qualified","no_answer","callback"].includes(disposition) ? disposition : "unknown",
          years_in_business: String(answers.years_in_business ?? answers.years ?? ""),
          has_gc_license:    String(answers.has_gc_license ?? answers.gc_license ?? ""),
          has_liability_ins: String(answers.has_liability_insurance ?? answers.liability ?? ""),
          has_workers_comp:  String(answers.has_workers_comp ?? answers.workers_comp ?? ""),
          has_surety_bond:   String(answers.has_surety_bond ?? answers.surety_bond ?? ""),
          states_licensed:   String(answers.states_licensed ?? answers.states ?? ""),
          crew_size:         String(answers.crew_size ?? answers.crew ?? ""),
          raw_payload:       body as any,
          sms_upload_link_sent: false,
        }).select("id").single();

        if (disposition === "not_qualified") {
          return Response.json({ received: true, action: "none", reason: "not_qualified" });
        }

        const siteUrl = process.env.VITE_SITE_URL ?? "https://jobbidder.io";
        const name = existing?.name ?? (lang === "es" ? "amigo" : lang === "fr" ? "ami" : lang === "pt" ? "amigo" : lang === "ht" ? "zanmi" : "there");
        const smsBody = PREQUAL_SMS[lang](name, `${siteUrl}/contractor-apply`);

        let smsSent = false;
        try {
          await sendSmsViaGHL({ to: phone, body: smsBody, credentials: ghlCreds() });
          smsSent = true;
          if (callRow?.id) {
            await supabaseAdmin
              .from("voice_prequal_calls")
              .update({ sms_upload_link_sent: true })
              .eq("id", callRow.id);
          }
        } catch { /* SMS failure must not break the webhook response */ }

        return Response.json({ received: true, action: "sms_sent", sms_sent: smsSent, lang, contractor_id: existing?.id ?? null });
      },
    },
  },
});
