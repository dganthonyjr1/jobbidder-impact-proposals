/**
 * POST /api/public/proposal-client-photos
 *
 * Lets a proposal's client (no auth required — they're visiting a public
 * /p/$id link, possibly not signed in at all) attach job-site photos/video.
 * This exists so that capability doesn't require a broad client-side RLS
 * UPDATE grant on the whole proposals table — this route is the security
 * boundary instead, and it only ever touches client_photos.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  photos: z.array(z.string().url()).max(50),
});

export const Route = createFileRoute("/api/public/proposal-client-photos")({
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
        let input: z.infer<typeof BodySchema>;
        try {
          input = BodySchema.parse(await request.json());
        } catch (e) {
          return Response.json({ success: false, error: "Invalid request", details: (e as Error).message }, { status: 400 });
        }

        const { error } = await supabaseAdmin
          .from("proposals")
          .update({ client_photos: input.photos })
          .eq("id", input.proposalId);

        if (error) {
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
