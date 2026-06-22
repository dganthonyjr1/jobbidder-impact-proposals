import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { triggerGhlWorkflow } from "@/lib/ghl.server";

// 9:00 AM – 9:59 AM America/New_York
function isInCallWindow(): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(fmt.format(new Date()), 10);
  return h >= 9 && h < 10;
}

export const Route = createFileRoute("/api/public/hooks/process-jessica-followups")({
  server: {
    handlers: {
      POST: async () => {
        if (!isInCallWindow()) {
          return Response.json({ ok: true, processed: 0, reason: "outside_call_window" });
        }

        const workflowId = process.env.GHL_JESSICA_FOLLOWUP_WORKFLOW_ID;
        if (!workflowId) {
          return Response.json(
            { ok: false, error: "GHL_JESSICA_FOLLOWUP_WORKFLOW_ID not configured" },
            { status: 500 },
          );
        }

        const { data: pending, error } = await supabaseAdmin
          .from("jessica_followup_queue")
          .select("id, contact_id, phone, name")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!pending || pending.length === 0) {
          return Response.json({ ok: true, processed: 0 });
        }

        const results: any[] = [];
        for (const row of pending) {
          const result = await triggerGhlWorkflow({ contactId: row.contact_id, workflowId });

          await supabaseAdmin
            .from("jessica_followup_queue")
            .update({
              status: result.ok ? "called" : "failed",
              error: result.ok ? null : result.error,
              processed_at: new Date().toISOString(),
            })
            .eq("id", row.id);

          results.push({ id: row.id, contactId: row.contact_id, ok: result.ok, error: result.error });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },

      GET: async () =>
        Response.json({ ok: true, hint: "POST to process pending Jessica follow-up calls (runs during 9–10 AM Pacific)" }),
    },
  },
});
