import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  agent_id: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

async function createGHLWebCall(agentId: string): Promise<{ url: string; token: string }> {
  const ghlApiToken = process.env.GHL_API_TOKEN;
  const ghlLocationId = process.env.GHL_LOCATION_ID;

  if (!ghlApiToken || !ghlLocationId) {
    throw new Error("GHL_API_TOKEN or GHL_LOCATION_ID not configured");
  }

  // GHL API endpoint to create a web call session for an agent
  const response = await fetch("https://rest.gohighlevel.com/v1/agents/web-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ghlApiToken}`,
      "X-GHL-Location-Id": ghlLocationId,
    },
    body: JSON.stringify({
      agent_id: agentId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`GHL API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return {
    url: data.url || data.web_call_url,
    token: data.token || data.access_token || "",
  };
}

async function logWebCallEvent(
  request: Request,
  agentId: string,
  status: "initiated" | "failed",
  errorMessage?: string
) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await supabaseAdmin.from("web_call_events").insert({
      agent_id: agentId,
      client_ip: clientIp,
      user_agent: userAgent,
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WebCall] Failed to log event:", error);
    // Don't throw - logging failure shouldn't break the API
  }
}

export const Route = createFileRoute("/api/public/create-web-call")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch (e) {
          await logWebCallEvent(request, "unknown", "failed", `Invalid payload: ${(e as Error).message}`);
          return Response.json(
            { error: "Invalid payload", details: (e as Error).message },
            { status: 400, headers: cors() }
          );
        }

        try {
          // Create web call session via GHL API
          const webCallSession = await createGHLWebCall(input.agent_id);

          // Log successful initiation
          await logWebCallEvent(request, input.agent_id, "initiated");

          return Response.json(
            {
              url: webCallSession.url,
              token: webCallSession.token,
            },
            { status: 200, headers: cors() }
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          await logWebCallEvent(request, input.agent_id, "failed", errorMsg);

          console.error("[WebCall] Error creating web call:", error);
          return Response.json(
            { error: "Failed to create web call", details: errorMsg },
            { status: 500, headers: cors() }
          );
        }
      },
    },
  },
});
