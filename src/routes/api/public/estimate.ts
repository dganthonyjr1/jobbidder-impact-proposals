import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const QuerySchema = z.object({ id: z.string().uuid() });

/**
 * Public estimate view. Reads the estimate + contractor branding server-side
 * via the service role and returns only branding-safe contractor fields, so
 * the public browser key never needs read access to the estimates/contractors
 * tables (their anon SELECT policies are removed). Also records the view and
 * promotes draft/sent -> viewed, matching the old client-side behavior.
 */
export const Route = createFileRoute("/api/public/estimate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let input: z.infer<typeof QuerySchema>;
        try {
          input = QuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
        } catch (e) {
          return Response.json(
            { success: false, error: "Invalid estimate link", details: (e as Error).message },
            { status: 400 },
          );
        }

        const { data: estimate, error: estimateError } = await supabaseAdmin
          .from("estimates")
          .select("*")
          .eq("id", input.id)
          .maybeSingle();

        if (estimateError || !estimate) {
          return Response.json({ success: false, error: "Estimate not found" }, { status: 404 });
        }

        const { data: contractor } = estimate.contractor_id
          ? await supabaseAdmin
              .from("contractors")
              .select("id, business_name, phone, email, logo_url, primary_color")
              .eq("id", estimate.contractor_id)
              .maybeSingle()
          : { data: null };

        // Record the view (best-effort) and promote status.
        try {
          const ua = request.headers.get("user-agent") ?? null;
          await supabaseAdmin.from("estimate_views").insert({ estimate_id: input.id, user_agent: ua });
          if (estimate.status === "draft" || estimate.status === "sent") {
            await supabaseAdmin.from("estimates").update({ status: "viewed" }).eq("id", input.id);
          }
        } catch (e) {
          console.warn("[estimate] view tracking failed:", (e as Error).message);
        }

        return Response.json({ success: true, estimate, contractor });
      },
    },
  },
});
