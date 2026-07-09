/**
 * /api/public/leads — Store qualified leads captured by the AI chatbot
 *
 * Fix #3: Lead capture now posts here instead of polluting support-ticket table.
 * Stores name, email, sessionId, pageUrl, and timestamp in chat_leads table.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/leads")({
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
        try {
          const body = await request.json();
          const { name, email, sessionId, pageUrl } = body;

          if (!name || !email) {
            return new Response(JSON.stringify({ error: "name and email are required" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: "invalid email format" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const supabaseKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await (supabase as any)
              .from("chat_leads")
              .insert({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                session_id: sessionId || null,
                page_url: pageUrl || null,
                status: "new",
              });

            if (error) {
              console.error("[leads API] Supabase insert error:", error.message);
              // Still return 200 — don't fail the user experience over a DB error
            }
          } else {
            console.warn("[leads API] Supabase credentials not found — lead not stored");
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: any) {
          console.error("[leads API] Error:", err?.message);
          return new Response(JSON.stringify({ error: "internal server error" }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      },
    },
  },
});
