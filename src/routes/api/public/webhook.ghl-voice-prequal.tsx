/**
 * POST /api/public/webhook/ghl-voice-prequal
 *
 * GHL fires this webhook at the end of the "Jessica - Voice Pre-Qual" call.
 * Records the result, links to any existing contractor application, and sends
 * an upload-link SMS — all before a human at NGS is involved.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL } from "@/lib/ghl.server";

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
  async loader({ request }) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" },
      });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

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

    const { data: existing } = await supabaseAdmin
      .from("contractor_applications")
      .select("id, name")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin.from("voice_prequal_calls").insert({
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
    });

    if (disposition === "not_qualified") {
      return Response.json({ received: true, action: "none", reason: "not_qualified" });
    }

    const siteUrl = process.env.VITE_SITE_URL ?? "https://jobbidder.io";
    const name = existing?.name ?? "there";
    const smsBody =
      `Hi ${name}! Thanks for speaking with NGS. To complete your contractor pre-qualification, ` +
      `please upload your license, insurance, and bonding documents — it only takes 5 minutes: ` +
      `${siteUrl}/contractor-apply`;

    let smsSent = false;
    try {
      await sendSmsViaGHL(ghlCreds(), phone, smsBody);
      smsSent = true;
      await supabaseAdmin
        .from("voice_prequal_calls")
        .update({ sms_upload_link_sent: true })
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1);
    } catch { /* SMS failure must not break the webhook response */ }

    return Response.json({ received: true, action: "sms_sent", sms_sent: smsSent, contractor_id: existing?.id ?? null });
  },
});
