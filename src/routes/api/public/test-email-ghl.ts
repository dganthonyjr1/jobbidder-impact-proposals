import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendEmailViaGHL } from "@/lib/ghl.server";

const BodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(2000).optional(),
  html: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const Route = createFileRoute("/api/public/test-email-ghl")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input;
        try { input = BodySchema.parse(await request.json()); }
        catch (e) { return Response.json({ error: "Invalid request", details: (e as Error).message }, { status: 400 }); }
        const result = await sendEmailViaGHL({
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
        });
        return Response.json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});
