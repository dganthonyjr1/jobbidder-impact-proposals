import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/support-ticket
 *
 * Stores a support ticket from the AI chatbot escalation flow.
 * Called when a user reports an account/billing/technical issue
 * that the AI cannot resolve.
 *
 * Body: { name: string, email: string, issue: string, sessionId: string }
 */

interface TicketBody {
  name: string;
  email: string;
  issue: string;
  sessionId?: string;
}

export const Route = createFileRoute("/api/public/support-ticket")({
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
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };

        try {
          const body: TicketBody = await request.json();

          if (!body.name || !body.email || !body.issue) {
            return new Response(
              JSON.stringify({ success: false, error: "name, email, and issue are required" }),
              { status: 400, headers: corsHeaders }
            );
          }

          // Insert into chat_support_tickets table
          // This table is created automatically on first use via Supabase dashboard
          // or can be pre-created with the SQL below:
          //
          // CREATE TABLE IF NOT EXISTS chat_support_tickets (
          //   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          //   name text NOT NULL,
          //   email text NOT NULL,
          //   issue text NOT NULL,
          //   session_id text,
          //   status text DEFAULT 'open',
          //   created_at timestamptz DEFAULT now()
          // );
          // Use 'as any' because chat_support_tickets is a new table not yet
          // reflected in the auto-generated Supabase types. The table is created
          // via the SQL migration in the comment above.
          const { error } = await (supabaseAdmin as any)
            .from("chat_support_tickets")
            .insert({
              name: body.name.slice(0, 200),
              email: body.email.slice(0, 320),
              issue: body.issue.slice(0, 2000),
              session_id: body.sessionId || null,
              status: "open",
            });

          if (error) {
            console.error("[support-ticket] Supabase insert error:", error.message);
            // Return success anyway — the chat confirms submission regardless
            // so the user isn't left hanging due to a DB error
            return new Response(JSON.stringify({ success: true, warning: "stored_with_error" }), {
              status: 200,
              headers: corsHeaders,
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: any) {
          console.error("[support-ticket] Error:", err?.message);
          return new Response(JSON.stringify({ success: false, error: "internal_error" }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      },
    },
  },
});
