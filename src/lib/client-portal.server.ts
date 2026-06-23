/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * Client Portal System - Shareable Proposal Links
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import crypto from "crypto";

export type ClientPortalAccess = {
  portal_id: string;
  proposal_id: string;
  client_email: string;
  client_phone: string;
  access_token: string;
  expires_at: string;
  permissions: string[];
  created_at: string;
};

/**
 * Generate shareable proposal link for client
 * Creates unique access token and sends SMS/email
 */
export const generateClientPortalLink = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        proposal_id: z.string().uuid(),
        client_email: z.string().email(),
        client_phone: z.string(),
        client_name: z.string(),
        expires_in_days: z.number().default(30),
        send_sms: z.boolean().default(true),
        send_email: z.boolean().default(true),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const {
      proposal_id,
      client_email,
      client_phone,
      client_name,
      expires_in_days,
      send_sms,
      send_email,
    } = input;

    // Generate unique access token
    const access_token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

    // Create portal access record
    const { data: portal, error: portal_error } = await supabaseAdmin
      .from("client_portal_access")
      .insert({
        proposal_id,
        client_email,
        client_phone,
        client_name,
        access_token,
        expires_at,
        permissions: ["view_proposal", "download_proposal", "message_contractor"],
      })
      .select()
      .single();

    if (portal_error) throw new Error(`Portal creation failed: ${portal_error.message}`);

    // Generate portal URL
    const portal_url = `${process.env.VITE_APP_URL}/client-portal/${access_token}`;

    // Send SMS if requested
    if (send_sms && client_phone) {
      try {
        // TODO: Integrate with SMS provider (Twilio, etc.)
        console.log(`SMS to ${client_phone}: View your proposal: ${portal_url}`);
      } catch (sms_error) {
        console.error("SMS send failed:", sms_error);
      }
    }

    // Send email if requested
    if (send_email && client_email) {
      try {
        // TODO: Integrate with email provider (SendGrid, etc.)
        console.log(`Email to ${client_email}: View your proposal: ${portal_url}`);
      } catch (email_error) {
        console.error("Email send failed:", email_error);
      }
    }

    return {
      portal_id: portal.id,
      access_token,
      portal_url,
      expires_at,
      message: "Client portal link generated successfully",
    };
  });

/**
 * Get client portal access
 * Validates token and returns proposal data
 */
export const getClientPortalAccess = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        access_token: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { access_token } = input;

    // Validate token
    const { data: portal, error: portal_error } = await supabaseAdmin
      .from("client_portal_access")
      .select("*, proposals(*)")
      .eq("access_token", access_token)
      .single();

    if (portal_error) throw new Error("Invalid or expired access token");

    // Check expiration
    if (new Date(portal.expires_at) < new Date()) {
      throw new Error("Access token has expired");
    }

    return {
      portal_id: portal.id,
      client_name: portal.client_name,
      client_email: portal.client_email,
      proposal: portal.proposals,
      permissions: portal.permissions,
      expires_at: portal.expires_at,
    };
  });

/**
 * Update client portal permissions
 * Admin function to grant/revoke client permissions
 */
export const updateClientPortalPermissions = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
        permissions: z.array(z.string()),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id, permissions } = input;

    const { data, error } = await supabaseAdmin
      .from("client_portal_access")
      .update({ permissions })
      .eq("id", portal_id)
      .select()
      .single();

    if (error) throw new Error("Failed to update permissions");

    return {
      portal_id,
      permissions,
      message: "Permissions updated successfully",
    };
  });

/**
 * Revoke client portal access
 * Invalidates access token
 */
export const revokeClientPortalAccess = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id } = input;

    const { error } = await supabaseAdmin
      .from("client_portal_access")
      .update({ access_token: null, expires_at: new Date().toISOString() })
      .eq("id", portal_id);

    if (error) throw new Error("Failed to revoke access");

    return {
      portal_id,
      message: "Client portal access revoked",
    };
  });

/**
 * Record client portal action
 * Tracks client interactions with proposals
 */
export const recordClientPortalAction = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
        action: z.enum(["view", "download", "message", "accept", "decline"]),
        details: z.record(z.any()).optional(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id, action, details } = input;

    const { data, error } = await supabaseAdmin
      .from("client_portal_actions")
      .insert({
        portal_id,
        action,
        details: details || {},
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Failed to record action");

    return {
      action_id: data.id,
      action,
      timestamp: data.timestamp,
    };
  });

/**
 * Send message from client to contractor
 * Creates message record and notifies contractor
 */
export const sendClientMessage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
        message: z.string().min(1).max(1000),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id, message } = input;

    // Get portal access to find proposal
    const { data: portal, error: portal_error } = await supabaseAdmin
      .from("client_portal_access")
      .select("*, proposals(contractor_id)")
      .eq("id", portal_id)
      .single();

    if (portal_error) throw new Error("Portal not found");

    // Create message record
    const { data: msg, error: msg_error } = await supabaseAdmin
      .from("client_messages")
      .insert({
        portal_id,
        proposal_id: portal.proposal_id,
        contractor_id: portal.proposals.contractor_id,
        client_name: portal.client_name,
        client_email: portal.client_email,
        message,
        read: false,
      })
      .select()
      .single();

    if (msg_error) throw new Error("Failed to send message");

    // TODO: Send notification to contractor (SMS/email)

    return {
      message_id: msg.id,
      status: "sent",
      timestamp: msg.created_at,
    };
  });

/**
 * Accept proposal as client
 * Records acceptance and triggers workflow
 */
export const acceptProposal = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
        signature_url: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id, signature_url } = input;

    // Get portal and proposal
    const { data: portal, error: portal_error } = await supabaseAdmin
      .from("client_portal_access")
      .select("*, proposals(*)")
      .eq("id", portal_id)
      .single();

    if (portal_error) throw new Error("Portal not found");

    // Update proposal status
    const { data: proposal, error: proposal_error } = await supabaseAdmin
      .from("proposals")
      .update({
        status: "accepted",
        client_accepted_at: new Date().toISOString(),
        client_signature_url: signature_url,
      })
      .eq("id", portal.proposal_id)
      .select()
      .single();

    if (proposal_error) throw new Error("Failed to accept proposal");

    // Record action
    await recordClientPortalAction({
      portal_id,
      action: "accept",
      details: { signature_url },
    });

    // TODO: Notify contractor of acceptance

    return {
      proposal_id: proposal.id,
      status: "accepted",
      message: "Proposal accepted successfully",
    };
  });

/**
 * Decline proposal as client
 * Records decline and triggers workflow
 */
export const declineProposal = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        portal_id: z.string().uuid(),
        reason: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { portal_id, reason } = input;

    // Get portal and proposal
    const { data: portal, error: portal_error } = await supabaseAdmin
      .from("client_portal_access")
      .select("*, proposals(*)")
      .eq("id", portal_id)
      .single();

    if (portal_error) throw new Error("Portal not found");

    // Update proposal status
    const { data: proposal, error: proposal_error } = await supabaseAdmin
      .from("proposals")
      .update({
        status: "declined",
        client_declined_at: new Date().toISOString(),
        decline_reason: reason,
      })
      .eq("id", portal.proposal_id)
      .select()
      .single();

    if (proposal_error) throw new Error("Failed to decline proposal");

    // Record action
    await recordClientPortalAction({
      portal_id,
      action: "decline",
      details: { reason },
    });

    // TODO: Notify contractor of decline

    return {
      proposal_id: proposal.id,
      status: "declined",
      message: "Proposal declined",
    };
  });
