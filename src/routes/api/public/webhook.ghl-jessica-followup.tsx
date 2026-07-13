import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { triggerGhlWorkflow } from "@/lib/ghl.server";

type JsonRecord = Record<string, any>;

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...extra,
  };
}

function firstString(...values: any[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// Returns 0-23 in America/New_York timezone
function easternHour(): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

// 9:00 AM – 9:59 AM Eastern
function isInCallWindow(): boolean {
  const h = easternHour();
  return h >= 9 && h < 10;
}

export const Route = createFileRoute("/api/public/webhook/ghl-jessica-followup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const testMode = url.searchParams.get("test") === "true";
        const body: JsonRecord = await request.json().catch(() => ({}));

        const contactId = firstString(
          body.id,
          body.contact_id,
          body.contactId,
          body.contact?.id,
        );
        const phone = firstString(
          body.phone,
          body.phone_number,
          body.phoneNumber,
          body.contact?.phone,
        );
        const name = firstString(
          body.full_name,
          body.fullName,
          body.name,
          body.contact?.name,
          [
            body.first_name || body.firstName || body.contact?.firstName,
            body.last_name || body.lastName || body.contact?.lastName,
          ]
            .filter(Boolean)
            .join(" "),
        );
        const locationId = firstString(body.locationId, body.location_id);

        if (!contactId) {
          return Response.json(
            { ok: false, error: "Missing contact id in webhook payload" },
            { status: 400, headers: cors() },
          );
        }

        const workflowId = process.env.GHL_JESSICA_FOLLOWUP_WORKFLOW_ID;
        if (!workflowId) {
          return Response.json(
            { ok: false, error: "GHL_JESSICA_FOLLOWUP_WORKFLOW_ID not configured" },
            { status: 500, headers: cors() },
          );
        }

        // Idempotency: skip if this contact is already queued or called
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("jessica_followup_queue")
          .select("id, status")
          .eq("contact_id", contactId)
          .in("status", ["pending", "called"])
          .maybeSingle();
        if (existingError) console.error("[webhook.ghl-jessica-followup] Idempotency check failed:", existingError.message);

        if (existing) {
          return Response.json(
            {
              ok: true,
              action: "skipped",
              reason: existing.status === "called" ? "already_called" : "already_queued",
            },
            { headers: cors() },
          );
        }

        if (testMode || isInCallWindow()) {
          const result = await triggerGhlWorkflow({ contactId, workflowId });

          await supabaseAdmin.from("jessica_followup_queue").insert({
            contact_id: contactId,
            phone,
            name,
            location_id: locationId,
            status: result.ok ? "called" : "failed",
            error: result.ok ? null : result.error,
            processed_at: new Date().toISOString(),
          });

          if (!result.ok) {
            return Response.json(
              { ok: false, action: "call_failed", error: result.error },
              { status: 500, headers: cors() },
            );
          }

          return Response.json(
            { ok: true, action: "called", contactId },
            { headers: cors() },
          );
        }

        // Outside the 9–10 AM call window — queue for next window
        const { error: insertErr } = await supabaseAdmin
          .from("jessica_followup_queue")
          .insert({
            contact_id: contactId,
            phone,
            name,
            location_id: locationId,
            status: "pending",
          });

        if (insertErr) {
          // Unique constraint violation means they're already queued — that's fine
          if (insertErr.code !== "23505") {
            return Response.json(
              { ok: false, error: insertErr.message },
              { status: 500, headers: cors() },
            );
          }
        }

        return Response.json(
          { ok: true, action: "queued", contactId },
          { headers: cors() },
        );
      },

      GET: async () =>
        Response.json(
          { ok: true, hint: "POST with GHL contact payload to schedule a Jessica follow-up call" },
          { headers: cors() },
        ),

      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
