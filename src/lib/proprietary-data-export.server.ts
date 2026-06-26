/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Proprietary Data Export Format - Access Control & Lock-in
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import crypto from "crypto";

/**
 * Proprietary Data Export Format
 * 
 * Creates a custom export format that:
 * 1. Includes proprietary metadata (NGS scoring, compliance rules)
 * 2. Requires Jobbidder.io to properly import
 * 3. Makes data less useful in other systems
 * 4. Increases switching costs
 */

export type ProprietaryDataExport = {
  format_version: string;
  export_date: string;
  export_hash: string;
  contractor_data: ContractorExportData[];
  metadata: ExportMetadata;
  compliance_rules: ComplianceRules;
  scoring_algorithms: ScoringAlgorithms;
};

export type ContractorExportData = {
  contractor_id: string;
  basic_info: any;
  qualification_data: any;
  performance_metrics: any;
  compliance_history: any;
  ngs_scoring: any;
  proprietary_tags: string[];
};

export type ExportMetadata = {
  total_contractors: number;
  export_period: string;
  data_completeness: number; // percentage
  proprietary_features: string[];
};

export type ComplianceRules = {
  state_requirements: Record<string, any>;
  insurance_minimums: Record<string, any>;
  license_requirements: Record<string, any>;
  renewal_schedules: Record<string, any>;
};

export type ScoringAlgorithms = {
  ngs_formula: string;
  weighting_factors: Record<string, number>;
  threshold_rules: Record<string, any>;
};

/**
 * Export contractor data in proprietary format
 * Includes all NGS-specific logic and compliance rules
 */
export const exportContractorDataProprietary = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractor_ids: z.array(z.string().uuid()).optional(),
        include_performance: z.boolean().default(true),
        include_compliance: z.boolean().default(true),
        include_algorithms: z.boolean().default(false), // Restricted
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_ids, include_performance, include_compliance, include_algorithms } = input;

    // Fetch contractors
    let query = supabaseAdmin.from("contractor_applications").select("*");

    if (contractor_ids && contractor_ids.length > 0) {
      query = query.in("id", contractor_ids);
    }

    const { data: contractors, error } = await query;

    if (error) throw new Error("Failed to fetch contractors");

    // Build export data
    const contractor_data: ContractorExportData[] = [];

    for (const contractor of contractors || []) {
      const export_item: ContractorExportData = {
        contractor_id: contractor.id,
        basic_info: {
          name: contractor.name,
          email: contractor.email,
          phone: contractor.phone,
          company: contractor.company_name,
          trade: contractor.trade,
        },
        qualification_data: {
          years_in_operation: contractor.years_in_operation,
          commercial_glazing_experience: contractor.commercial_glazing_experience,
          average_project_size: contractor.average_project_size,
          window_film_experience: contractor.window_film_experience,
          crew_size: contractor.crew_size,
          states_licensed: contractor.states_licensed,
          osha_record: contractor.osha_record,
          availability: contractor.availability,
          surety_bond: contractor.surety_bond,
          workers_comp: contractor.workers_comp,
        },
        performance_metrics: {},
        compliance_history: {},
        ngs_scoring: {
          score: contractor.qualification_score,
          percentage: contractor.qualification_percentage,
          status: contractor.qualification_status,
          timestamp: contractor.created_at,
        },
        proprietary_tags: [
          "ngs_qualified",
          "jobbidder_verified",
          `score_${contractor.qualification_score}`,
        ],
      };

      // Include performance metrics if requested
      if (include_performance) {
        const { data: metrics } = await supabaseAdmin
          .from("contractor_performance_metrics")
          .select("metrics")
          .eq("contractor_id", contractor.id)
          .single();

        export_item.performance_metrics = metrics?.metrics || {};
      }

      // Include compliance history if requested
      if (include_compliance) {
        const { data: compliance } = await supabaseAdmin
          .from("compliance_audit_trail")
          .select("*")
          .eq("contractor_id", contractor.id);

        export_item.compliance_history = compliance || [];
      }

      contractor_data.push(export_item);
    }

    // Prepare metadata
    const metadata: ExportMetadata = {
      total_contractors: contractor_data.length,
      export_period: `${new Date().toISOString()}`,
      data_completeness: 100,
      proprietary_features: [
        "ngs_scoring_algorithm",
        "state_compliance_rules",
        "contractor_performance_tracking",
        "compliance_audit_trail",
        "qualification_scoring",
      ],
    };

    // Prepare compliance rules (NGS-specific)
    const compliance_rules: ComplianceRules = {
      state_requirements: {
        CA: {
          license_required: true,
          license_type: "Commercial Glazing",
          liability_minimum: 1000000,
          workers_comp_required: true,
        },
        NV: {
          license_required: true,
          license_type: "Commercial Glazing",
          liability_minimum: 1000000,
          workers_comp_required: true,
        },
        AZ: {
          license_required: true,
          license_type: "Commercial Glazing",
          liability_minimum: 1000000,
          workers_comp_required: true,
        },
      },
      insurance_minimums: {
        general_liability: 1000000,
        workers_compensation: 500000,
        surety_bond: 250000,
      },
      license_requirements: {
        commercial_glazing: {
          states: ["CA", "NV", "AZ", "TX"],
          renewal_period: 12,
        },
      },
      renewal_schedules: {
        insurance: { months: 12 },
        license: { months: 24 },
        surety_bond: { months: 12 },
      },
    };

    // Prepare scoring algorithms (proprietary - only if authorized)
    const scoring_algorithms: ScoringAlgorithms = include_algorithms
      ? {
          ngs_formula:
            "sum(years_score + glazing_score + project_size_score + film_score + crew_score + osha_score + availability_score + bond_score + workers_comp_score)",
          weighting_factors: {
            years_in_operation: 1.0,
            commercial_glazing_experience: 1.0,
            average_project_size: 1.0,
            window_film_experience: 0.5,
            crew_size: 0.5,
            osha_record: 0.5,
            availability: 0.5,
            surety_bond: 0.5,
            workers_comp: 0.5,
          },
          threshold_rules: {
            approved: { min_score: 84, min_percentage: 70 },
            pending_review: { min_score: 0, max_score: 83 },
            rejected: { max_score: -1 },
          },
        }
      : {};

    // Create export object
    const export_data: ProprietaryDataExport = {
      format_version: "1.0",
      export_date: new Date().toISOString(),
      export_hash: crypto
        .createHash("sha256")
        .update(JSON.stringify(contractor_data))
        .digest("hex"),
      contractor_data,
      metadata,
      compliance_rules,
      scoring_algorithms,
    };

    // Log export for audit trail
    await supabaseAdmin.from("data_export_audit_log").insert({
      export_type: "proprietary_format",
      contractor_count: contractor_data.length,
      include_performance,
      include_compliance,
      include_algorithms,
      export_hash: export_data.export_hash,
      timestamp: new Date().toISOString(),
    });

    return export_data;
  });

/**
 * Import proprietary format data
 * Validates data integrity and proprietary metadata
 */
export const importProprietaryFormatData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        export_data: z.any(), // ProprietaryDataExport
        validate_hash: z.boolean().default(true),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { export_data, validate_hash } = input;

    // Validate format version
    if (export_data.format_version !== "1.0") {
      throw new Error("Unsupported export format version");
    }

    // Validate data integrity
    if (validate_hash) {
      const calculated_hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(export_data.contractor_data))
        .digest("hex");

      if (calculated_hash !== export_data.export_hash) {
        throw new Error("Data integrity check failed - export may be corrupted");
      }
    }

    // Import contractors
    const import_results = [];

    for (const contractor_data of export_data.contractor_data) {
      try {
        const { data: contractor, error } = await supabaseAdmin
          .from("contractor_applications")
          .upsert({
            id: contractor_data.contractor_id,
            ...contractor_data.basic_info,
            ...contractor_data.qualification_data,
            qualification_score: contractor_data.ngs_scoring.score,
            qualification_percentage: contractor_data.ngs_scoring.percentage,
            qualification_status: contractor_data.ngs_scoring.status,
          })
          .select()
          .single();

        if (error) throw error;

        import_results.push({
          contractor_id: contractor_data.contractor_id,
          status: "imported",
        });
      } catch (error: any) {
        import_results.push({
          contractor_id: contractor_data.contractor_id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      total_imported: import_results.filter((r) => r.status === "imported").length,
      total_failed: import_results.filter((r) => r.status === "failed").length,
      results: import_results,
    };
  });

/**
 * Restrict data export to authorized users only
 * Prevents unauthorized bulk data extraction
 */
export const validateExportAuthorization = async (user_id: string): Promise<boolean> => {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("role, export_permissions")
    .eq("id", user_id)
    .single();

  if (error) return false;

  // Only admins and authorized users can export
  return user.role === "admin" || user.export_permissions?.includes("proprietary_export");
};
