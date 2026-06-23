/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * Enhanced GHL Integration - Deep data synchronization and workflow automation
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Enhanced GHL Integration
 * 
 * Creates deep integration with GHL that makes switching platforms expensive:
 * - Bi-directional data sync (GHL ↔ Jobbidder)
 * - Webhook management and monitoring
 * - Contact enrichment from GHL data
 * - Workflow automation triggers
 * - Data consistency verification
 * - Automatic retry and error handling
 */

export type GhlSyncStatus = {
  contact_id: string;
  last_sync: string;
  sync_status: "synced" | "pending" | "failed";
  data_version: number;
  fields_synced: string[];
  next_sync: string;
  error_message?: string;
};

/**
 * Sync contractor data from GHL to Jobbidder
 * Creates tight integration that increases switching costs
 */
export const syncContractorFromGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ghl_contact_id: z.string(),
        contractor_id: z.string().uuid().optional(),
        force_sync: z.boolean().default(false),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { ghl_contact_id, contractor_id, force_sync } = input;

    // Fetch contact from GHL
    const ghl_token = process.env.GHL_API_TOKEN;
    if (!ghl_token) throw new Error("GHL_API_TOKEN not configured");

    const ghl_response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${ghl_contact_id}`,
      {
        headers: {
          Authorization: `Bearer ${ghl_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!ghl_response.ok) {
      throw new Error(
        `Failed to fetch GHL contact: ${ghl_response.statusText}`
      );
    }

    const ghl_contact = await ghl_response.json();

    // Extract contractor data from GHL custom fields
    const contractor_data = {
      name: ghl_contact.contact?.firstName + " " + ghl_contact.contact?.lastName,
      email: ghl_contact.contact?.email,
      phone: ghl_contact.contact?.phone,
      trade: ghl_contact.customFields?.trade || "Commercial Glazing",
      years_experience: parseInt(
        ghl_contact.customFields?.yearsInOperation || "0"
      ),
      service_area: ghl_contact.customFields?.statesLicensed || "",
      ghl_contact_id,
      ghl_data: ghl_contact,
      last_ghl_sync: new Date().toISOString(),
    };

    // Upsert contractor in Jobbidder
    const { data: contractor, error } = await supabaseAdmin
      .from("contractor_applications")
      .upsert(
        contractor_id
          ? { id: contractor_id, ...contractor_data }
          : contractor_data
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to sync contractor: ${error.message}`);

    // Record sync status
    await supabaseAdmin
      .from("ghl_sync_status")
      .upsert({
        contact_id: ghl_contact_id,
        contractor_id: contractor.id,
        last_sync: new Date().toISOString(),
        sync_status: "synced",
        data_version: 1,
        fields_synced: Object.keys(contractor_data),
      });

    return contractor;
  });

/**
 * Sync contractor data back to GHL
 * Keeps GHL updated with Jobbidder data (increases lock-in)
 */
export const syncContractorToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        ghl_contact_id: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, ghl_contact_id } = input;

    // Fetch contractor from Jobbidder
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_applications")
      .select("*")
      .eq("id", contractor_id)
      .single();

    if (fetchError) throw new Error("Contractor not found");

    // Fetch performance metrics
    const { data: metrics } = await supabaseAdmin
      .from("contractor_performance_metrics")
      .select("metrics")
      .eq("contractor_id", contractor_id)
      .single();

    // Prepare custom fields for GHL
    const custom_fields = {
      yearsInOperation: contractor.years_experience,
      commercialGlazingExperience: contractor.commercial_glazing_experience,
      averageProjectSize: contractor.average_project_size,
      windowFilmExperience: contractor.window_film_experience,
      crewSize: contractor.crew_size,
      statesLicensed: contractor.states_licensed,
      oshaRecord: contractor.osha_record,
      availability: contractor.availability,
      sureryBond: contractor.surety_bond,
      workersComp: contractor.workers_comp,
      qualificationScore: contractor.qualification_score,
      qualificationStatus: contractor.qualification_status,
      // Performance metrics
      acceptanceRate: metrics?.metrics?.acceptance_rate || 0,
      successRate: metrics?.metrics?.success_rate || 0,
      clientSatisfaction: metrics?.metrics?.client_satisfaction_rating || 0,
      qualityScore: metrics?.metrics?.quality_score || 0,
    };

    // Update GHL contact
    const ghl_token = process.env.GHL_API_TOKEN;
    if (!ghl_token) throw new Error("GHL_API_TOKEN not configured");

    const ghl_response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${ghl_contact_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ghl_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customFields: custom_fields,
        }),
      }
    );

    if (!ghl_response.ok) {
      throw new Error(`Failed to update GHL contact: ${ghl_response.statusText}`);
    }

    // Record sync status
    await supabaseAdmin
      .from("ghl_sync_status")
      .upsert({
        contact_id: ghl_contact_id,
        contractor_id,
        last_sync: new Date().toISOString(),
        sync_status: "synced",
        data_version: 2,
        fields_synced: Object.keys(custom_fields),
      });

    return { success: true, synced_fields: Object.keys(custom_fields) };
  });

/**
 * Verify GHL webhook configuration
 * Ensures webhooks are properly configured for data sync
 */
export const verifyGhlWebhookConfiguration = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        webhook_url: z.string().url(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { webhook_url } = input;

    const ghl_token = process.env.GHL_API_TOKEN;
    const ghl_location_id = process.env.GHL_LOCATION_ID;

    if (!ghl_token || !ghl_location_id)
      throw new Error("GHL credentials not configured");

    // Get existing webhooks
    const webhooks_response = await fetch(
      `https://rest.gohighlevel.com/v1/locations/${ghl_location_id}/webhooks`,
      {
        headers: {
          Authorization: `Bearer ${ghl_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!webhooks_response.ok) {
      throw new Error(
        `Failed to fetch webhooks: ${webhooks_response.statusText}`
      );
    }

    const webhooks_data = await webhooks_response.json();
    const existing_webhook = webhooks_data.webhooks?.find(
      (w: any) => w.url === webhook_url
    );

    if (existing_webhook) {
      return {
        configured: true,
        webhook_id: existing_webhook.id,
        events: existing_webhook.events,
        message: "Webhook already configured",
      };
    }

    // Create new webhook if not exists
    const create_response = await fetch(
      `https://rest.gohighlevel.com/v1/locations/${ghl_location_id}/webhooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghl_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhook_url,
          events: [
            "contact.created",
            "contact.updated",
            "contact.deleted",
            "custom_field.updated",
          ],
        }),
      }
    );

    if (!create_response.ok) {
      throw new Error(`Failed to create webhook: ${create_response.statusText}`);
    }

    const new_webhook = await create_response.json();

    return {
      configured: true,
      webhook_id: new_webhook.id,
      events: new_webhook.events,
      message: "Webhook created successfully",
    };
  });

/**
 * Get GHL sync status for contractor
 * Shows data synchronization status and health
 */
export const getGhlSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id } = input;

    const { data: sync_status, error } = await supabaseAdmin
      .from("ghl_sync_status")
      .select("*")
      .eq("contractor_id", contractor_id)
      .single();

    if (error) {
      return {
        contractor_id,
        sync_status: "not_synced",
        last_sync: null,
        message: "Contractor not yet synced with GHL",
      };
    }

    return sync_status;
  });

/**
 * Trigger manual sync for contractor
 * Forces immediate data synchronization
 */
export const triggerManualSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        direction: z.enum(["to_ghl", "from_ghl", "bidirectional"]),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, direction } = input;

    // Fetch contractor
    const { data: contractor, error } = await supabaseAdmin
      .from("contractor_applications")
      .select("*")
      .eq("id", contractor_id)
      .single();

    if (error) throw new Error("Contractor not found");

    if (!contractor.ghl_contact_id)
      throw new Error("Contractor not linked to GHL contact");

    let sync_results = {};

    if (direction === "from_ghl" || direction === "bidirectional") {
      // Sync from GHL to Jobbidder
      sync_results = {
        ...sync_results,
        from_ghl: await syncContractorFromGhl({
          ghl_contact_id: contractor.ghl_contact_id,
          contractor_id,
          force_sync: true,
        }),
      };
    }

    if (direction === "to_ghl" || direction === "bidirectional") {
      // Sync from Jobbidder to GHL
      sync_results = {
        ...sync_results,
        to_ghl: await syncContractorToGhl({
          contractor_id,
          ghl_contact_id: contractor.ghl_contact_id,
        }),
      };
    }

    return {
      contractor_id,
      sync_direction: direction,
      results: sync_results,
      timestamp: new Date().toISOString(),
    };
  });
