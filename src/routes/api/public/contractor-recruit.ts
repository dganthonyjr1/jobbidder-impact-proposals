/**
 * POST /api/public/contractor-recruit
 *
 * Intake webhook for contractor recruitment leads.
 * External systems (state licensing boards, referral networks, job boards)
 * POST contractor data here; the server validates eligibility, upserts a GHL
 * contact tagged for NGS glazing recruitment, triggers the hiring-agent
 * workflow, sends a personalized invite, and stores the outreach record.
 *
 * Authentication: Bearer token via CONTRACTOR_RECRUIT_API_KEY env var.
 *
 * Single recruit:
 *   POST /api/public/contractor-recruit
 *   Authorization: Bearer <CONTRACTOR_RECRUIT_API_KEY>
 *   { "name": "...", "phone": "...", "email": "...", "trade_type": "...", "service_state": "CA", "source": "licensing_board" }
 *
 * Bulk recruit (up to 50 per request):
 *   POST /api/public/contractor-recruit
 *   Authorization: Bearer <CONTRACTOR_RECRUIT_API_KEY>
 *   { "contractors": [ { ... }, { ... } ] }
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  recruitContractor,
  bulkRecruitContractors,
  NGS_STATES,
} from "@/lib/contractor-recruit.server";

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...extra,
  };
}

function unauthorized(msg = "Invalid or missing API key") {
  return Response.json({ ok: false, error: msg }, { status: 401, headers: cors() });
}

function verifyApiKey(request: Request): boolean {
  const apiKey = process.env.CONTRACTOR_RECRUIT_API_KEY;
  if (!apiKey) return false; // key not configured → deny all
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  return token === apiKey;
}

const SingleRecruit = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  trade_type: z.string().trim().max(100).nullable().optional(),
  service_state: z.string().trim().length(2).toUpperCase().nullable().optional(),
  source: z
    .enum(["api", "manual", "licensing_board", "referral"])
    .optional()
    .default("api"),
  source_ref: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  force: z.boolean().optional().default(false),
});

const BulkPayload = z.object({
  contractors: z.array(SingleRecruit).min(1).max(50),
});

const SinglePayload = SingleRecruit;

export const Route = createFileRoute("/api/public/contractor-recruit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      GET: async () =>
        Response.json(
          {
            service: "NGS Contractor Recruitment API",
            description:
              "POST glazing contractor leads here to trigger outreach via the NGS hiring agent.",
            operating_states: NGS_STATES,
            docs: "POST with { name, phone?, email?, trade_type, service_state, source? } or { contractors: [...] } for bulk.",
          },
          { headers: cors() },
        ),

      POST: async ({ request }) => {
        if (!verifyApiKey(request)) return unauthorized();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Request body must be valid JSON" },
            { status: 400, headers: cors() },
          );
        }

        // --- Bulk mode -------------------------------------------------------
        const bulkParse = BulkPayload.safeParse(body);
        if (bulkParse.success) {
          const result = await bulkRecruitContractors(bulkParse.data.contractors);
          return Response.json(result, { headers: cors() });
        }

        // --- Single mode -----------------------------------------------------
        const singleParse = SinglePayload.safeParse(body);
        if (!singleParse.success) {
          return Response.json(
            {
              ok: false,
              error: "Invalid payload",
              details: singleParse.error.flatten(),
            },
            { status: 400, headers: cors() },
          );
        }

        const result = await recruitContractor(singleParse.data);
        if (!result.ok) {
          const status =
            result.code === "TRADE_NOT_ELIGIBLE" || result.code === "STATE_NOT_COVERED"
              ? 422
              : 500;
          return Response.json(result, { status, headers: cors() });
        }

        return Response.json(result, { headers: cors() });
      },
    },
  },
});
