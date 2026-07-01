/**
 * POST /api/public/contractor-portal-session
 * Body: { token: string }  — the magic-link token.
 *
 * Verifies the token and returns the contractor's application status +
 * documents. No token / bad token / expired → 401.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPortalToken } from "@/lib/contractor-portal-auth.server";

const Body = z.object({ token: z.string().min(10) });

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export const Route = createFileRoute("/api/public/contractor-portal-session")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        let token: string;
        try {
          token = Body.parse(await request.json()).token;
        } catch {
          return Response.json({ ok: false, error: "Missing token" }, { status: 400, headers: cors() });
        }

        const verified = verifyPortalToken(token);
        if (!verified) {
          return Response.json({ ok: false, error: "This link is invalid or has expired. Request a new one." }, { status: 401, headers: cors() });
        }

        const { data: app } = await supabaseAdmin
          .from("contractor_applications")
          .select("id, name, email, phone, trade_type, service_area, license_number, license_url, insurance_url, status, qualification_status, qualification_score, qualification_percentage, created_at")
          .eq("id", verified.applicationId)
          .maybeSingle();

        if (!app) {
          return Response.json({ ok: false, error: "Application not found." }, { status: 404, headers: cors() });
        }

        const { data: docs } = await supabaseAdmin
          .from("contractor_documents")
          .select("id, document_type, status, expiration_date, file_name, created_at")
          .eq("contractor_id", app.id)
          .order("created_at", { ascending: false });

        return Response.json({ ok: true, contractor: app, documents: docs ?? [] }, { headers: cors() });
      },
    },
  },
});
