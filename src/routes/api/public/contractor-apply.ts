import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL, sendEmailViaGHL } from "@/lib/ghl.server";

const Body = z.object({
  ghl_contact_id: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(254).nullable().optional(),
  trade_type: z.string().trim().max(100).nullable().optional(),
  years_experience: z.string().trim().max(20).nullable().optional(),
  service_area: z.string().trim().max(200).nullable().optional(),
  license_number: z.string().trim().max(100).nullable().optional(),
  license_url: z.string().url(),
  insurance_url: z.string().url(),
  agrees_to_terms: z.boolean(),
});

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export const Route = createFileRoute("/api/public/contractor-apply")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch (e) {
          return Response.json(
            { ok: false, error: "Invalid payload", details: (e as Error).message },
            { status: 400, headers: cors() },
          );
        }

        if (!input.agrees_to_terms) {
          return Response.json(
            { ok: false, error: "Applicant must agree to terms." },
            { status: 400, headers: cors() },
          );
        }

        const { data: inserted, error: dbErr } = await supabaseAdmin
          .from("contractor_applications")
          .insert({
            ghl_contact_id: input.ghl_contact_id || null,
            name: input.name,
            phone: input.phone,
            email: input.email || null,
            trade_type: input.trade_type || null,
            years_experience: input.years_experience || null,
            service_area: input.service_area || null,
            license_number: input.license_number || null,
            license_url: input.license_url,
            insurance_url: input.insurance_url,
            agrees_to_terms: true,
            status: "submitted",
          })
          .select("id")
          .single();

        if (dbErr) {
          return Response.json(
            { ok: false, error: dbErr.message },
            { status: 500, headers: cors() },
          );
        }

        const firstName = input.name.split(" ")[0];

        // Confirmation SMS to contractor (non-blocking)
        sendSmsViaGHL({
          to: input.phone,
          body: `Hi ${firstName}! We received your contractor application and documents. Our team at National Glass Solutions will review everything and follow up with you shortly. Questions? Reply to this message.`,
          contactName: input.name,
          contactEmail: input.email || undefined,
        }).catch((e) => console.warn("[contractor-apply] confirmation SMS failed:", e?.message));

        // Notify NGS team
        const notifyPhone = process.env.NGS_NOTIFY_PHONE;
        const notifyEmail = process.env.NGS_NOTIFY_EMAIL;

        const alertBody =
          `New contractor application from ${input.name} (${input.phone})` +
          (input.trade_type ? ` — ${input.trade_type}` : "") +
          (input.service_area ? ` — ${input.service_area}` : "") +
          `. Review docs in Jobbidder dashboard.`;

        if (notifyPhone) {
          sendSmsViaGHL({
            to: notifyPhone,
            body: alertBody,
            contactName: "NGS Notify",
          }).catch((e) => console.warn("[contractor-apply] NGS SMS notify failed:", e?.message));
        }

        if (notifyEmail) {
          const docsHtml = `
            <p><strong>Applicant:</strong> ${input.name}</p>
            <p><strong>Phone:</strong> ${input.phone}</p>
            ${input.email ? `<p><strong>Email:</strong> ${input.email}</p>` : ""}
            ${input.trade_type ? `<p><strong>Trade:</strong> ${input.trade_type}</p>` : ""}
            ${input.years_experience ? `<p><strong>Experience:</strong> ${input.years_experience} years</p>` : ""}
            ${input.service_area ? `<p><strong>Service Area:</strong> ${input.service_area}</p>` : ""}
            ${input.license_number ? `<p><strong>License #:</strong> ${input.license_number}</p>` : ""}
            <p><strong>License:</strong> <a href="${input.license_url}">${input.license_url}</a></p>
            <p><strong>Insurance:</strong> <a href="${input.insurance_url}">${input.insurance_url}</a></p>
            <hr/>
            <p>Application ID: ${inserted.id}</p>
          `;
          sendEmailViaGHL({
            to: notifyEmail,
            subject: `New Contractor Application: ${input.name}`,
            html: docsHtml,
            text: alertBody,
            contactName: input.name,
            contactPhone: input.phone,
          }).catch((e) =>
            console.warn("[contractor-apply] NGS email notify failed:", e?.message),
          );
        }

        return Response.json(
          { ok: true, application_id: inserted.id },
          { headers: cors() },
        );
      },
    },
  },
});
