/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * Contractor Authentication System - Multi-Language Support
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export type ContractorRole = "contractor" | "contractor_admin" | "contractor_manager";

export type ContractorAuthContext = {
  contractor_id: string;
  user_id: string;
  email: string;
  phone: string;
  company_name: string;
  role: ContractorRole;
  language: "en" | "es" | "pt" | "fr" | "de";
  permissions: string[];
  created_at: string;
};

/**
 * Register contractor account
 * Creates separate contractor user with isolated access
 */
export const registerContractorAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string(),
        company_name: z.string(),
        trade: z.string(),
        language: z.enum(["en", "es", "pt", "fr", "de"]).default("en"),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { email, password, phone, company_name, trade, language } = input;

    // Create Supabase auth user
    const { data: auth_user, error: auth_error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (auth_error) throw new Error(`Auth creation failed: ${auth_error.message}`);

    // Create contractor profile
    const { data: contractor, error: contractor_error } = await supabaseAdmin
      .from("contractor_applications")
      .insert({
        name: company_name,
        email,
        phone,
        company_name,
        trade,
        auth_user_id: auth_user.user.id,
        language,
        status: "pending_verification",
      })
      .select()
      .single();

    if (contractor_error) throw new Error(`Contractor creation failed: ${contractor_error.message}`);

    // Create contractor user role
    const { error: role_error } = await supabaseAdmin
      .from("contractor_users")
      .insert({
        user_id: auth_user.user.id,
        contractor_id: contractor.id,
        role: "contractor",
        language,
        permissions: ["view_own_profile", "view_own_projects", "upload_documents"],
      });

    if (role_error) throw new Error(`Role assignment failed: ${role_error.message}`);

    return {
      contractor_id: contractor.id,
      user_id: auth_user.user.id,
      email,
      message: "Contractor account created successfully",
    };
  });

/**
 * Contractor login
 * Authenticates contractor and returns session
 */
export const loginContractor = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        password: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { email, password } = input;

    // Authenticate with Supabase
    const { data: auth_data, error: auth_error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (auth_error) throw new Error("Invalid email or password");

    // Get contractor profile
    const { data: contractor_user, error: user_error } = await supabaseAdmin
      .from("contractor_users")
      .select("*, contractor_applications(*)")
      .eq("user_id", auth_data.user.id)
      .single();

    if (user_error) throw new Error("Contractor profile not found");

    return {
      session: auth_data.session,
      contractor: contractor_user.contractor_applications,
      auth_context: {
        contractor_id: contractor_user.contractor_id,
        user_id: auth_data.user.id,
        email: auth_data.user.email,
        role: contractor_user.role,
        language: contractor_user.language,
        permissions: contractor_user.permissions,
      },
    };
  });

/**
 * Get contractor auth context
 * Returns current contractor's authentication and permission context
 */
export const getContractorAuthContext = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        user_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { user_id } = input;

    const { data: contractor_user, error } = await supabaseAdmin
      .from("contractor_users")
      .select("*, contractor_applications(*)")
      .eq("user_id", user_id)
      .single();

    if (error) throw new Error("Contractor profile not found");

    const auth_context: ContractorAuthContext = {
      contractor_id: contractor_user.contractor_id,
      user_id,
      email: contractor_user.contractor_applications.email,
      phone: contractor_user.contractor_applications.phone,
      company_name: contractor_user.contractor_applications.company_name,
      role: contractor_user.role,
      language: contractor_user.language,
      permissions: contractor_user.permissions,
      created_at: contractor_user.created_at,
    };

    return auth_context;
  });

/**
 * Check if contractor has permission
 * Validates contractor permissions for specific actions
 */
export const checkContractorPermission = async (
  user_id: string,
  permission: string
): Promise<boolean> => {
  const { data: contractor_user, error } = await supabaseAdmin
    .from("contractor_users")
    .select("permissions")
    .eq("user_id", user_id)
    .single();

  if (error) return false;

  return contractor_user.permissions.includes(permission);
};

/**
 * Update contractor language preference
 * Changes language for all UI and communications
 */
export const updateContractorLanguage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        user_id: z.string().uuid(),
        language: z.enum(["en", "es", "pt", "fr", "de"]),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { user_id, language } = input;

    const { data, error } = await supabaseAdmin
      .from("contractor_users")
      .update({ language })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw new Error("Failed to update language");

    return {
      user_id,
      language,
      message: "Language preference updated",
    };
  });

/**
 * Grant contractor permission
 * Admin function to grant new permissions to contractors
 */
export const grantContractorPermission = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        user_id: z.string().uuid(),
        permission: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { user_id, permission } = input;

    const { data: contractor_user, error: fetch_error } = await supabaseAdmin
      .from("contractor_users")
      .select("permissions")
      .eq("user_id", user_id)
      .single();

    if (fetch_error) throw new Error("Contractor not found");

    const updated_permissions = [...(contractor_user.permissions || []), permission];

    const { error: update_error } = await supabaseAdmin
      .from("contractor_users")
      .update({ permissions: updated_permissions })
      .eq("user_id", user_id);

    if (update_error) throw new Error("Failed to grant permission");

    return {
      user_id,
      permission,
      message: "Permission granted successfully",
    };
  });

/**
 * Revoke contractor permission
 * Admin function to revoke permissions from contractors
 */
export const revokeContractorPermission = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        user_id: z.string().uuid(),
        permission: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { user_id, permission } = input;

    const { data: contractor_user, error: fetch_error } = await supabaseAdmin
      .from("contractor_users")
      .select("permissions")
      .eq("user_id", user_id)
      .single();

    if (fetch_error) throw new Error("Contractor not found");

    const updated_permissions = contractor_user.permissions.filter((p: string) => p !== permission);

    const { error: update_error } = await supabaseAdmin
      .from("contractor_users")
      .update({ permissions: updated_permissions })
      .eq("user_id", user_id);

    if (update_error) throw new Error("Failed to revoke permission");

    return {
      user_id,
      permission,
      message: "Permission revoked successfully",
    };
  });
