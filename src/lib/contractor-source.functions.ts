/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Server functions for the contractor search & recruit dashboard.
 * Called from _authenticated.contractor-search.tsx via useServerFn().
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { searchContractorsForNiche } from "@/lib/contractor-sourcing.server";
import { recruitContractor, NGS_SERVICE_NICHES, NGS_NICHE_IDS, NGS_STATES } from "@/lib/contractor-recruit.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// searchContractors — find potential recruits via Google Places
// ---------------------------------------------------------------------------

export const searchContractors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      nicheId: z.string().min(1),
      state: z.string().length(2).toUpperCase(),
      city: z.string().optional(),
      maxResults: z.number().int().min(1).max(50).optional().default(20),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    return searchContractorsForNiche({
      nicheId: data.nicheId,
      state: data.state,
      city: data.city,
      maxResults: data.maxResults,
    });
  });

// ---------------------------------------------------------------------------
// sendRecruitInvite — invite a single sourced contractor
// ---------------------------------------------------------------------------

export const sendRecruitInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().min(1).max(200),
      phone: z.string().max(30).nullable().optional(),
      email: z.string().email().max(254).nullable().optional(),
      trade_type: z.string().max(150).nullable().optional(),
      niche: z.string().max(80),
      service_state: z.string().length(2).toUpperCase(),
      source: z.enum(["manual", "google_places", "api", "referral"]).default("google_places"),
      source_ref: z.string().max(200).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Prevent duplicate outreach to the same phone/email
    if (data.phone || data.email) {
      const existing = await supabaseAdmin
        .from("contractor_recruits")
        .select("id, status, invite_sent_at")
        .or(
          [
            data.phone ? `phone.eq.${data.phone}` : null,
            data.email ? `email.eq.${data.email}` : null,
          ]
            .filter(Boolean)
            .join(","),
        )
        .maybeSingle();

      if (existing.data) {
        return {
          ok: false,
          error: "Already recruited",
          code: "DUPLICATE",
          existing_id: existing.data.id,
          status: existing.data.status,
        };
      }
    }

    return recruitContractor({
      name: data.name,
      phone: data.phone,
      email: data.email,
      trade_type: data.trade_type ?? null,
      niche: data.niche,
      service_state: data.service_state,
      source: data.source,
      source_ref: data.source_ref,
      notes: data.notes,
    });
  });

// ---------------------------------------------------------------------------
// listRecruits — show outreach history in the dashboard
// ---------------------------------------------------------------------------

export const listRecruits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("contractor_recruits")
      .select(
        "id, name, phone, email, trade_type, service_niche, service_state, source, invite_method, invite_sent_at, status, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------------------------------------------------------------------------
// updateRecruitStatus — mark a recruit as applied / declined / unresponsive
// ---------------------------------------------------------------------------

export const updateRecruitStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["invited", "applied", "declined", "unresponsive"]),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("contractor_recruits")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// getNicheList — send niche + state config to the client
// ---------------------------------------------------------------------------

export const getNicheList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    niches: NGS_SERVICE_NICHES.map((n) => ({
      id: n.id,
      label: n.label,
      parentService: n.parentService,
    })),
    states: NGS_STATES as string[],
    stateCities: (await import("@/lib/contractor-sourcing.server")).NGS_STATE_CITIES,
  }));
