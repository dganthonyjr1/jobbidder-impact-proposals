import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateEstimateNumber, buildFallbackEstimate } from "@/lib/estimates.server";
import { sendSmsViaGHL, sendEmailViaGHL } from "@/lib/ghl.server";
import Groq from "groq-sdk";

const Body = z.object({
  slug: z.string().trim().min(1),
  client_name: z.string().trim().min(1).max(120),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().trim().optional().nullable(),
  job_address: z.string().trim().optional().nullable(),
  job_state: z.string().trim().optional().nullable(),
  trade_type: z.string().trim().max(100).optional().nullable(),
  job_description: z.string().trim().min(10).max(3000),
  language: z.enum(["en", "es", "fr", "pt", "ht"]).default("en"),
});

function languageName(lang: string) {
  const map: Record<string, string> = { en: "English", es: "Spanish", fr: "French", pt: "Portuguese", ht: "Haitian Creole" };
  return map[lang] || "English";
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function callGroqForEstimate(opts: {
  contractor: { business_name: string; trade_type: string | null };
  job: {
    client_name: string;
    job_address: string | null;
    job_state: string | null;
    trade_type: string | null;
    job_description: string;
  };
  language: string;
}) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const langName = languageName(opts.language);

  const system = `You are a senior estimator for ${opts.contractor.business_name} (${opts.contractor.trade_type || opts.job.trade_type || "general contracting"}). Produce a quick, realistic BALLPARK ESTIMATE with price RANGES in USD. This is not a binding proposal — give honest low/high ranges that account for site unknowns. Write ALL human-readable text fields (scope_summary, timeline_text) in ${langName}. Numeric fields stay as numbers. Return ONLY valid JSON, no markdown, no explanation.`;

  const user = `CLIENT: ${opts.job.client_name}
ADDRESS: ${opts.job.job_address || "TBD"}${opts.job.job_state ? ", " + opts.job.job_state : ""}
TRADE: ${opts.job.trade_type || "general"}
JOB DESCRIPTION: ${opts.job.job_description}

Return this exact JSON shape with numbers only (no $ signs, no commas):
{
  "scope_summary": "1-2 short paragraphs summarizing what's included",
  "material_low": number,
  "material_high": number,
  "labor_low": number,
  "labor_high": number,
  "total_low": number,
  "total_high": number,
  "timeline_text": "e.g. 3-5 business days"
}
Rules:
- total_low must equal material_low + labor_low
- total_high must equal material_high + labor_high
- high should typically be 20-40% above low for an honest range
- Use realistic pricing for the trade and region`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Groq estimate response");
  return JSON.parse(jsonMatch[0]);
}

// SMS message templates per language
function estimateSmsBody(lang: string, opts: { clientName: string; business: string; url: string }) {
  const { clientName, business, url } = opts;
  const templates: Record<string, string> = {
    en: `Hi ${clientName}, your free estimate from ${business} is ready! View it here: ${url} — Reply STOP to opt out`,
    es: `Hola ${clientName}, ¡tu presupuesto gratuito de ${business} está listo! Véalo aquí: ${url} — Responde STOP para cancelar`,
    fr: `Bonjour ${clientName}, votre estimation gratuite de ${business} est prête ! Consultez-la ici : ${url} — Répondez STOP pour vous désabonner`,
    pt: `Olá ${clientName}, seu orçamento gratuito de ${business} está pronto! Veja aqui: ${url} — Responda STOP para cancelar`,
    ht: `Bonjou ${clientName}, estimasyon gratis ou nan men ${business} pare! Gade li isit la: ${url} — Reponn STOP pou dezabòne`,
  };
  return templates[lang] || templates.en;
}

export const Route = createFileRoute("/api/public/estimate-submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }}),
      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          const raw = await request.json();
          input = Body.parse(raw);
        } catch (e: any) {
          return Response.json({ ok: false, error: e.message }, { status: 400 });
        }

        // Look up contractor by slug
        const { data: contractor, error: cErr } = await supabaseAdmin
          .from("contractors")
          .select("id, business_name, trade_type, phone, email, pricing_settings, ghl_location_id")
          .eq("slug", input.slug)
          .maybeSingle();
        if (cErr || !contractor) {
          return Response.json({ ok: false, error: "Contractor not found" }, { status: 404 });
        }

        // Generate estimate via Groq (with fallback)
        let aiData;
        try {
          aiData = await callGroqForEstimate({
            contractor: { business_name: contractor.business_name, trade_type: contractor.trade_type },
            job: {
              client_name: input.client_name,
              job_address: input.job_address || null,
              job_state: input.job_state || null,
              trade_type: input.trade_type || null,
              job_description: input.job_description,
            },
            language: input.language,
          });
        } catch (e) {
          // Fallback to static estimate if Groq fails
          aiData = buildFallbackEstimate({
            contractor: { business_name: contractor.business_name, trade_type: contractor.trade_type },
            job: {
              client_name: input.client_name,
              job_address: input.job_address || null,
              job_state: input.job_state || null,
              trade_type: input.trade_type || null,
              job_description: input.job_description,
            },
            language: input.language,
          });
        }

        const validThrough = new Date();
        validThrough.setDate(validThrough.getDate() + 7);

        // Insert estimate into DB
        const { data: created, error: insErr } = await supabaseAdmin
          .from("estimates")
          .insert({
            contractor_id: contractor.id,
            estimate_number: generateEstimateNumber(),
            status: "sent",
            client_name: input.client_name,
            client_email: input.client_email || null,
            client_phone: input.client_phone ? toE164(input.client_phone) : null,
            job_address: input.job_address || null,
            job_state: input.job_state || null,
            trade_type: input.trade_type || null,
            job_description: input.job_description,
            language: input.language,
            scope_summary: aiData.scope_summary,
            material_low: aiData.material_low,
            material_high: aiData.material_high,
            labor_low: aiData.labor_low,
            labor_high: aiData.labor_high,
            total_low: aiData.total_low,
            total_high: aiData.total_high,
            timeline_text: aiData.timeline_text,
            valid_through: validThrough.toISOString().slice(0, 10),
          })
          .select("id, estimate_number")
          .single();

        if (insErr || !created) {
          return Response.json({ ok: false, error: insErr?.message || "DB insert failed" }, { status: 500 });
        }

        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const estimateUrl = `${origin}/e/${created.id}`;

        // Send SMS notification
        if (input.client_phone) {
          const phone = toE164(input.client_phone);
          const smsBody = estimateSmsBody(input.language, {
            clientName: input.client_name,
            business: contractor.business_name,
            url: estimateUrl,
          });
          try {
            await sendSmsViaGHL({ to: phone, body: smsBody });
          } catch (_) {
            // Non-fatal — estimate was created, SMS delivery failed
          }
        }

        // Send email notification via GHL
        if (input.client_email) {
          try {
            // sendEmailViaGHL imported at top
            const emailSubjects: Record<string, string> = {
              en: `Your free estimate from ${contractor.business_name} is ready`,
              es: `Tu presupuesto gratuito de ${contractor.business_name} está listo`,
              fr: `Votre estimation gratuite de ${contractor.business_name} est prête`,
              pt: `Seu orçamento gratuito de ${contractor.business_name} está pronto`,
              ht: `Estimasyon gratis ou nan men ${contractor.business_name} pare`,
            };
            const emailBodies: Record<string, string> = {
              en: `<p>Hi ${input.client_name},</p><p>Your free estimate from <strong>${contractor.business_name}</strong> is ready. View it here:</p><p><a href="${estimateUrl}" style="background:#FF6B00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">View My Estimate</a></p><p>This estimate is valid for 7 days. Want a detailed proposal with itemized costs and a signature line? Click "Get the full proposal" on your estimate page.</p>`,
              es: `<p>Hola ${input.client_name},</p><p>Tu presupuesto gratuito de <strong>${contractor.business_name}</strong> está listo. Véalo aquí:</p><p><a href="${estimateUrl}" style="background:#FF6B00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Ver Mi Presupuesto</a></p><p>Este presupuesto es válido por 7 días.</p>`,
              fr: `<p>Bonjour ${input.client_name},</p><p>Votre estimation gratuite de <strong>${contractor.business_name}</strong> est prête. Consultez-la ici :</p><p><a href="${estimateUrl}" style="background:#FF6B00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Voir Mon Estimation</a></p><p>Cette estimation est valable 7 jours.</p>`,
              pt: `<p>Olá ${input.client_name},</p><p>Seu orçamento gratuito de <strong>${contractor.business_name}</strong> está pronto. Veja aqui:</p><p><a href="${estimateUrl}" style="background:#FF6B00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Ver Meu Orçamento</a></p><p>Este orçamento é válido por 7 dias.</p>`,
              ht: `<p>Bonjou ${input.client_name},</p><p>Estimasyon gratis ou nan men <strong>${contractor.business_name}</strong> pare. Gade li isit la:</p><p><a href="${estimateUrl}" style="background:#FF6B00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Wè Estimasyon Mwen</a></p><p>Estimasyon sa a valid pou 7 jou.</p>`,
            };
            await sendEmailViaGHL({
              to: input.client_email,
              subject: emailSubjects[input.language] || emailSubjects.en,
              html: emailBodies[input.language] || emailBodies.en,
              fromEmail: "support@jobbidder.io",
              replyTo: contractor.email || undefined,
            });
          } catch (_) {
            // Non-fatal
          }
        }

        return Response.json({
          ok: true,
          estimate_id: created.id,
          estimate_number: created.estimate_number,
          estimate_url: estimateUrl,
        });
      },
    },
  },
});
