/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary contractor matching and hiring logic
 * protected by:
 * - U.S. Patent Application (Provisional) - June 23, 2026
 * - Copyright Law
 * - Trade Secret Protection
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listContractorApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contractor_applications")
      .select(
        "id, name, phone, email, trade_type, years_experience, service_area, license_number, license_url, insurance_url, status, notes, created_at, ghl_contact_id"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getContractorProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ contractor_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contractor_applications")
      .select("id, name, phone, email, trade_type, service_area, license_number, status, qualification_status, qualification_score, created_at")
      .eq("id", data.contractor_id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getContractorProposals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ contractor_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("contractor_applications")
      .select("id, name, status, created_at")
      .eq("id", data.contractor_id)
      .limit(1);
    if (error) console.error("[getContractorProposals] Lookup failed:", error.message);
    return rows ?? [];
  });

export const getContractorStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ contractor_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: docs, error: docsError } = await supabaseAdmin
      .from("contractor_documents")
      .select("id, status, document_type")
      .eq("contractor_id", data.contractor_id);
    if (docsError) console.error("[getContractorStats] Documents lookup failed:", docsError.message);
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("contractor_performance_events")
      .select("id, event_type")
      .eq("contractor_id", data.contractor_id);
    if (eventsError) console.error("[getContractorStats] Performance events lookup failed:", eventsError.message);
    return {
      documents_uploaded: docs?.length ?? 0,
      documents_verified: docs?.filter((d: any) => d.status === "verified" || d.status === "ai_extracted").length ?? 0,
      jobs_completed: events?.filter((e: any) => e.event_type === "project_completed").length ?? 0,
      jobs_active: events?.filter((e: any) => e.event_type === "offer_accepted").length ?? 0,
    };
  });

export const updateContractorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["submitted", "approved", "rejected", "pending_docs"]),
    notes: z.string().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("contractor_applications")
      .update({ status: data.status, notes: data.notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
