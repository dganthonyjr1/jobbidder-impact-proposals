/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Copyright (c) 2026 [Your Company Name]. All rights reserved.
 * 
 * This file contains proprietary compliance audit trail logic protected by:
 * - U.S. Patent Application (Provisional) - June 23, 2026
 * - Copyright Law - Trade Secret Protection
 * 
 * Unauthorized access, use, or distribution is strictly prohibited.
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Compliance Audit Trail System
 * 
 * Tracks all compliance verification activities for regulatory compliance
 * and defensibility against audits. Creates immutable records of:
 * - Document verification (COI, license, insurance, bond)
 * - Compliance status changes
 * - Expiration date tracking
 * - Renewal requests
 * - Manual reviews
 * - Compliance violations
 */

export type ComplianceAuditEvent = {
  id: string;
  contractor_id: string;
  event_type:
    | "document_uploaded"
    | "document_verified"
    | "compliance_check_passed"
    | "compliance_check_failed"
    | "expiration_warning"
    | "renewal_requested"
    | "manual_review_required"
    | "compliance_violation"
    | "status_changed";
  document_type?: "coi" | "license" | "workers_comp" | "surety_bond";
  status: "pending" | "verified" | "failed" | "expired" | "renewed";
  details: Record<string, any>;
  created_at: string;
  created_by: string;
  notes?: string;
};

/**
 * Create compliance audit trail entry
 * Immutable record of all compliance verification activities
 */
export const createComplianceAuditEntry = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        event_type: z.enum([
          "document_uploaded",
          "document_verified",
          "compliance_check_passed",
          "compliance_check_failed",
          "expiration_warning",
          "renewal_requested",
          "manual_review_required",
          "compliance_violation",
          "status_changed",
        ]),
        document_type: z
          .enum(["coi", "license", "workers_comp", "surety_bond"])
          .optional(),
        status: z.enum(["pending", "verified", "failed", "expired", "renewed"]),
        details: z.record(z.any()),
        notes: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ input, context }) => {
    const { contractor_id, event_type, document_type, status, details, notes } =
      input;

    const { data, error } = await supabaseAdmin
      .from("compliance_audit_trail")
      .insert({
        contractor_id,
        event_type,
        document_type,
        status,
        details,
        notes,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create audit entry: ${error.message}`);

    return data;
  });

/**
 * Get compliance audit trail for contractor
 * Shows complete history of all compliance verification activities
 */
export const getComplianceAuditTrail = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, limit, offset } = input;

    const { data, error } = await supabaseAdmin
      .from("compliance_audit_trail")
      .select("*")
      .eq("contractor_id", contractor_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch audit trail: ${error.message}`);

    return data;
  });

/**
 * Compliance Verification Checklist
 * State-specific requirements for contractor compliance
 */
export const COMPLIANCE_REQUIREMENTS = {
  CA: {
    state: "California",
    license: {
      required: true,
      issuer: "CSLB",
      types: ["A", "B", "C", "D"],
      verification_url: "https://www.cslb.ca.gov/",
    },
    general_liability: {
      required: true,
      minimum_coverage: 1000000,
      coverage_type: "GL",
    },
    workers_compensation: {
      required: true,
      minimum_coverage: 500000,
    },
    surety_bond: {
      required: true,
      minimum_amount: 15000,
      bond_type: "Contractor License Bond",
    },
  },
  NV: {
    state: "Nevada",
    license: {
      required: true,
      issuer: "CCOB",
      types: ["A", "B", "C"],
      verification_url: "https://ccob.nv.gov/",
    },
    general_liability: {
      required: true,
      minimum_coverage: 500000,
      coverage_type: "GL",
    },
    workers_compensation: {
      required: true,
      minimum_coverage: 500000,
    },
    surety_bond: {
      required: true,
      minimum_amount: 10000,
      bond_type: "Contractor License Bond",
    },
  },
  AZ: {
    state: "Arizona",
    license: {
      required: true,
      issuer: "RCAC",
      types: ["A", "B", "C"],
      verification_url: "https://rcac.az.gov/",
    },
    general_liability: {
      required: true,
      minimum_coverage: 1000000,
      coverage_type: "GL",
    },
    workers_compensation: {
      required: true,
      minimum_coverage: 500000,
    },
    surety_bond: {
      required: true,
      minimum_amount: 20000,
      bond_type: "Contractor License Bond",
    },
  },
  TX: {
    state: "Texas",
    license: {
      required: false,
      issuer: "None",
      types: [],
      verification_url: "N/A",
    },
    general_liability: {
      required: true,
      minimum_coverage: 1000000,
      coverage_type: "GL",
    },
    workers_compensation: {
      required: true,
      minimum_coverage: 500000,
    },
    surety_bond: {
      required: true,
      minimum_amount: 15000,
      bond_type: "Contractor License Bond",
    },
  },
};

/**
 * Verify contractor compliance against state requirements
 * Returns detailed compliance status for each requirement
 */
export const verifyContractorCompliance = async (
  contractor: any,
  state: string
) => {
  const requirements = COMPLIANCE_REQUIREMENTS[state as keyof typeof COMPLIANCE_REQUIREMENTS];

  if (!requirements) {
    throw new Error(`Unknown state: ${state}`);
  }

  const compliance_status = {
    state,
    overall_status: "PENDING_REVIEW" as const,
    requirements: {
      license: {
        required: requirements.license.required,
        status: contractor.license_verified ? "VERIFIED" : "PENDING",
        expiration_date: contractor.license_expiration,
        days_until_expiration: contractor.license_expiration
          ? Math.floor(
              (new Date(contractor.license_expiration).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
      general_liability: {
        required: requirements.general_liability.required,
        minimum_coverage: requirements.general_liability.minimum_coverage,
        status: contractor.gl_verified ? "VERIFIED" : "PENDING",
        current_coverage: contractor.gl_coverage,
        expiration_date: contractor.gl_expiration,
        days_until_expiration: contractor.gl_expiration
          ? Math.floor(
              (new Date(contractor.gl_expiration).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
      workers_compensation: {
        required: requirements.workers_compensation.required,
        minimum_coverage: requirements.workers_compensation.minimum_coverage,
        status: contractor.wc_verified ? "VERIFIED" : "PENDING",
        current_coverage: contractor.wc_coverage,
        expiration_date: contractor.wc_expiration,
        days_until_expiration: contractor.wc_expiration
          ? Math.floor(
              (new Date(contractor.wc_expiration).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
      surety_bond: {
        required: requirements.surety_bond.required,
        minimum_amount: requirements.surety_bond.minimum_amount,
        status: contractor.surety_verified ? "VERIFIED" : "PENDING",
        current_amount: contractor.surety_amount,
        expiration_date: contractor.surety_expiration,
        days_until_expiration: contractor.surety_expiration
          ? Math.floor(
              (new Date(contractor.surety_expiration).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
    },
  };

  // Determine overall compliance status
  const all_verified = Object.values(compliance_status.requirements).every(
    (req: any) => !req.required || req.status === "VERIFIED"
  );
  const any_expiring_soon = Object.values(compliance_status.requirements).some(
    (req: any) =>
      req.days_until_expiration !== null && req.days_until_expiration < 30
  );

  if (all_verified && !any_expiring_soon) {
    compliance_status.overall_status = "COMPLIANT";
  } else if (any_expiring_soon) {
    compliance_status.overall_status = "EXPIRATION_WARNING";
  } else {
    compliance_status.overall_status = "NON_COMPLIANT";
  }

  return compliance_status;
};

/**
 * Generate compliance report for contractor
 * Creates detailed documentation for regulatory compliance
 */
export const generateComplianceReport = async (contractor_id: string) => {
  const { data: contractor, error: contractorError } = await supabaseAdmin
    .from("contractor_applications")
    .select("*")
    .eq("id", contractor_id)
    .single();

  if (contractorError) throw new Error("Contractor not found");

  const { data: audit_trail, error: auditError } = await supabaseAdmin
    .from("compliance_audit_trail")
    .select("*")
    .eq("contractor_id", contractor_id)
    .order("created_at", { ascending: false });

  if (auditError) throw new Error("Failed to fetch audit trail");

  const compliance_status = await verifyContractorCompliance(
    contractor,
    contractor.service_area?.split(",")[0] || "CA"
  );

  return {
    report_date: new Date().toISOString(),
    contractor_id,
    contractor_name: contractor.name,
    compliance_status,
    audit_trail: audit_trail || [],
    summary: {
      total_events: audit_trail?.length || 0,
      verified_documents: audit_trail?.filter(
        (e: any) => e.status === "verified"
      ).length || 0,
      pending_verifications: audit_trail?.filter(
        (e: any) => e.status === "pending"
      ).length || 0,
      failed_verifications: audit_trail?.filter(
        (e: any) => e.status === "failed"
      ).length || 0,
    },
  };
};
