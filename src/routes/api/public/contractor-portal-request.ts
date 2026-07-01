/**
 * POST /api/public/contractor-portal-request
 * Body: { contact: string }  — the email or phone on the contractor's application.
 *
 * Finds the application and texts/emails a magic link to the contact ON FILE
 * (never to whatever was typed), so only the real applicant can get in.
 * Always returns { ok: true } so it can't be used to probe who has applied.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsViaGHL, sendEmailViaGHL } from "@/lib/ghl.server";
import { signPortalToken } from "@/lib/contractor-portal-auth.server";
import { toE164US } from "@/lib/twilio.server";

const Body = z.object({ contact: z.string().trim().min(3).max(254) });

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export const Route = createFileRoute("/api/public/contractor-portal-request")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "Enter the email or phone on your application." }, { status: 400, headers: cors() });
        }

        const raw = input.contact.trim();
        const isEmail = raw.includes("@");

        const query = supabaseAdmin
          .from("contractor_applications")
          .select("id, name, email, phone")
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: app } = isEmail
          ? await query.ilike("email", raw).maybeSingle()
          : await query.eq("phone", toE164US(raw)).maybeSingle();

        // Send the link only to the contact on file. Fail silently either way.
        if (app) {
          const origin = new URL(request.url).origin;
          const link = `${origin}/contractor?token=${encodeURIComponent(signPortalToken(app.id))}`;
          const firstName = (app.name || "there").split(" ")[0];

          if (app.email) {
            sendEmailViaGHL({
              to: app.email,
              subject: "Your Jobbidder contractor portal link",
              html: `<p>Hi ${firstName},</p><p>Here's your secure link to view your contractor application status and documents:</p><p><a href="${link}">Open my contractor portal</a></p><p>This link expires in 7 days.</p>`,
              text: `Hi ${firstName}, open your Jobbidder contractor portal: ${link} (expires in 7 days)`,
              contactName: app.name || undefined,
              contactPhone: app.phone,
            }).catch((e) => console.warn("[portal-request] email failed:", e?.message));
          }
          if (app.phone) {
            sendSmsViaGHL({
              to: app.phone,
              body: `Your Jobbidder contractor portal link (expires in 7 days): ${link} — Reply STOP to opt out.`,
              contactName: app.name || undefined,
              contactEmail: app.email || undefined,
            }).catch((e) => console.warn("[portal-request] sms failed:", e?.message));
          }
        }

        return Response.json(
          { ok: true, message: "If we found your application, a secure link is on its way to the email and phone on file." },
          { headers: cors() },
        );
      },
    },
  },
});
