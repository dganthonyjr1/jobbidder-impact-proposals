import { createFileRoute } from "@tanstack/react-router";
import { handleLeadIntake, cors } from "./webhook.ghl";

/**
 * Branded lead-intake webhook URL. Identical behavior to the legacy
 * /api/public/webhook/ghl path — this is the one shown/copied in the app UI
 * so no vendor name appears on screen. The legacy path stays live for
 * automations already configured against it.
 */
export const Route = createFileRoute("/api/public/webhook/jobbidder-intake")({
  server: {
    handlers: {
      POST: async ({ request }) => handleLeadIntake(request),
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});
