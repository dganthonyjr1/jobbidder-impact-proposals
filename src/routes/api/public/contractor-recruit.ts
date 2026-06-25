/**
 * POST /api/public/contractor-recruit
 *
 * Intake webhook for NGS contractor recruitment leads.
 * Covers every service niche on ngs.inc — trade type is auto-detected
 * from keywords or can be pinned with the `niche` field.
 *
 * Auth: Authorization: Bearer <CONTRACTOR_RECRUIT_API_KEY>
 *
 * Single:
 *   { "name": "...", "phone": "...", "trade_type": "Window Film Installer",
 *     "service_state": "CA", "source": "licensing_board" }
 *
 * With explicit niche override:
 *   { ..., "niche": "building-perimeter-hardening" }
 *
 * Bulk (≤50):
 *   { "contractors": [ {...}, {...} ] }
 *
 * GET returns service info + full niche catalog.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  recruitContractor,
  bulkRecruitContractors,
  NGS_STATES,
  NGS_SERVICE_NICHES,
  NGS_NICHE_IDS,
} from "@/lib/contractor-recruit.server";

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...extra,
  };
}

function unauthorized(msg = "Invalid or missing API key") {
  return Response.json({ ok: false, error: msg }, { status: 401, headers: cors() });
}

function verifyApiKey(request: Request): boolean {
  const apiKey = process.env.CONTRACTOR_RECRUIT_API_KEY;
  if (!apiKey) return false;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  return token === apiKey;
}

const SingleRecruit = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  trade_type: z.string().trim().max(150).nullable().optional(),
  /** Optional explicit niche ID — auto-detected from trade_type if omitted */
  niche: z.string().trim().max(80).nullable().optional(),
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

export const Route = createFileRoute("/api/public/contractor-recruit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      GET: async () =>
        Response.json(
          {
            service: "NGS Contractor Recruitment API",
            description:
              "POST contractor leads here to trigger niche-specific outreach via the NGS hiring agent.",
            operating_states: NGS_STATES,
            niches: NGS_SERVICE_NICHES.map((n) => ({
              id: n.id,
              label: n.label,
              parent_service: n.parentService,
              example_keywords: n.keywords.slice(0, 4),
            })),
            usage: {
              single: "POST { name, phone?, email?, trade_type?, niche?, service_state, source? }",
              bulk: "POST { contractors: [...] } — up to 50 per request",
              auth: "Authorization: Bearer <CONTRACTOR_RECRUIT_API_KEY>",
            },
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
        const singleParse = SingleRecruit.safeParse(body);
        if (!singleParse.success) {
          return Response.json(
            {
              ok: false,
              error: "Invalid payload",
              details: singleParse.error.flatten(),
              hint: "Provide at least: name + (phone or email) + service_state. " +
                    "Use niche field with one of: " + NGS_NICHE_IDS.join(", "),
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
