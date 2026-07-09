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

async function getRetellAccessToken(agentId: string): Promise<string> {
  const retellApiKey = process.env.RETELL_API_KEY;
  if (!retellApiKey) {
    throw new Error("RETELL_API_KEY not configured");
  }

  const response = await fetch("https://api.retellai.com/create-web-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${retellApiKey}`,
    },
    body: JSON.stringify({
      agent_id: agentId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Retell API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.access_token;
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
          // Get access token from Retell
          const accessToken = await getRetellAccessToken(input.agent_id);

          // Log successful initiation
          await logWebCallEvent(request, input.agent_id, "initiated");

          return Response.json(
            { access_token: accessToken },
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
