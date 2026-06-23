/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * Document Verification System - OCR & Compliance Checking
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export type DocumentType = "license" | "liability_insurance" | "workers_comp" | "surety_bond";

export type DocumentVerification = {
  document_id: string;
  contractor_id: string;
  document_type: DocumentType;
  file_url: string;
  status: "pending" | "verified" | "expired" | "invalid";
  extracted_data: Record<string, any>;
  expiration_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
};

/**
 * Upload contractor document
 * Handles file upload and OCR processing
 */
export const uploadContractorDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        document_type: z.enum(["license", "liability_insurance", "workers_comp", "surety_bond"]),
        file_url: z.string().url(),
        file_name: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, document_type, file_url, file_name } = input;

    // Create document record
    const { data: document, error: doc_error } = await supabaseAdmin
      .from("contractor_documents")
      .insert({
        contractor_id,
        document_type,
        file_url,
        file_name,
        status: "pending",
        extracted_data: {},
      })
      .select()
      .single();

    if (doc_error) throw new Error(`Document upload failed: ${doc_error.message}`);

    // TODO: Trigger OCR processing (async job)
    // await triggerOCRProcessing(document.id, file_url);

    return {
      document_id: document.id,
      status: "pending",
      message: "Document uploaded and queued for verification",
    };
  });

/**
 * Verify contractor document
 * Checks expiration, coverage limits, and validity
 */
export const verifyContractorDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        document_id: z.string().uuid(),
        extracted_data: z.record(z.any()),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { document_id, extracted_data } = input;

    // Get document
    const { data: document, error: doc_error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (doc_error) throw new Error("Document not found");

    // Verify based on document type
    let verification_status = "pending";
    let expiration_date = null;

    if (document.document_type === "license") {
      verification_status = await verifyLicense(extracted_data);
      expiration_date = extracted_data.expiration_date;
    } else if (document.document_type === "liability_insurance") {
      verification_status = await verifyLiabilityInsurance(extracted_data);
      expiration_date = extracted_data.policy_expiration;
    } else if (document.document_type === "workers_comp") {
      verification_status = await verifyWorkersComp(extracted_data);
      expiration_date = extracted_data.coverage_expiration;
    } else if (document.document_type === "surety_bond") {
      verification_status = await verifySuretyBond(extracted_data);
      expiration_date = extracted_data.bond_expiration;
    }

    // Update document record
    const { data: updated_doc, error: update_error } = await supabaseAdmin
      .from("contractor_documents")
      .update({
        status: verification_status,
        extracted_data,
        expiration_date,
        verified_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .select()
      .single();

    if (update_error) throw new Error("Failed to update document");

    // Create audit trail entry
    await supabaseAdmin.from("compliance_audit_trail").insert({
      contractor_id: document.contractor_id,
      event_type: "document_verified",
      document_type: document.document_type,
      status: verification_status,
      details: { document_id, extracted_data },
      created_by: document.contractor_id,
    });

    return {
      document_id,
      status: verification_status,
      expiration_date,
      message: `Document ${verification_status}`,
    };
  });

/**
 * Verify contractor license
 * Checks license number, state, and expiration
 */
async function verifyLicense(data: Record<string, any>): Promise<string> {
  const { license_number, state, expiration_date } = data;

  if (!license_number || !state) return "invalid";

  if (expiration_date) {
    const exp_date = new Date(expiration_date);
    if (exp_date < new Date()) return "expired";
  }

  // TODO: Check against state licensing board database
  return "verified";
}

/**
 * Verify liability insurance
 * Checks coverage limits and expiration
 */
async function verifyLiabilityInsurance(data: Record<string, any>): Promise<string> {
  const { policy_number, coverage_limit, policy_expiration } = data;

  if (!policy_number || !coverage_limit) return "invalid";

  // Check minimum coverage (typically $1M for commercial glazing)
  const coverage = parseInt(String(coverage_limit).replace(/[^0-9]/g, ""));
  if (coverage < 1000000) return "invalid";

  if (policy_expiration) {
    const exp_date = new Date(policy_expiration);
    if (exp_date < new Date()) return "expired";
  }

  // TODO: Verify with insurance provider
  return "verified";
}

/**
 * Verify workers' compensation insurance
 * Checks coverage and expiration
 */
async function verifyWorkersComp(data: Record<string, any>): Promise<string> {
  const { policy_number, coverage_expiration } = data;

  if (!policy_number) return "invalid";

  if (coverage_expiration) {
    const exp_date = new Date(coverage_expiration);
    if (exp_date < new Date()) return "expired";
  }

  // TODO: Verify with insurance provider
  return "verified";
}

/**
 * Verify surety bond
 * Checks bond amount and expiration
 */
async function verifySuretyBond(data: Record<string, any>): Promise<string> {
  const { bond_number, bond_amount, bond_expiration } = data;

  if (!bond_number || !bond_amount) return "invalid";

  // Check minimum bond amount (typically $50K-$100K)
  const amount = parseInt(String(bond_amount).replace(/[^0-9]/g, ""));
  if (amount < 50000) return "invalid";

  if (bond_expiration) {
    const exp_date = new Date(bond_expiration);
    if (exp_date < new Date()) return "expired";
  }

  // TODO: Verify with bond issuer
  return "verified";
}

/**
 * Get contractor documents
 * Returns all documents for a contractor
 */
export const getContractorDocuments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id } = input;

    const { data: documents, error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("contractor_id", contractor_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch documents");

    return {
      contractor_id,
      documents,
      total: documents.length,
    };
  });

/**
 * Check document expiration
 * Returns documents expiring soon
 */
export const checkExpiringDocuments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
        days_until_expiration: z.number().default(30),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, days_until_expiration } = input;

    const expiration_threshold = new Date(
      Date.now() + days_until_expiration * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: documents, error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("contractor_id", contractor_id)
      .lte("expiration_date", expiration_threshold)
      .gte("expiration_date", new Date().toISOString())
      .order("expiration_date", { ascending: true });

    if (error) throw new Error("Failed to fetch expiring documents");

    return {
      contractor_id,
      expiring_documents: documents,
      total: documents.length,
    };
  });

/**
 * Request document renewal
 * Sends notification to contractor to renew document
 */
export const requestDocumentRenewal = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        document_id: z.string().uuid(),
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { document_id, contractor_id } = input;

    // Get document
    const { data: document, error: doc_error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (doc_error) throw new Error("Document not found");

    // Create renewal request
    const { data: renewal, error: renewal_error } = await supabaseAdmin
      .from("document_renewal_requests")
      .insert({
        document_id,
        contractor_id,
        document_type: document.document_type,
        requested_at: new Date().toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (renewal_error) throw new Error("Failed to create renewal request");

    // TODO: Send SMS/email notification to contractor

    // Create audit trail
    await supabaseAdmin.from("compliance_audit_trail").insert({
      contractor_id,
      event_type: "renewal_requested",
      document_type: document.document_type,
      status: "pending",
      details: { document_id, renewal_id: renewal.id },
      created_by: contractor_id,
    });

    return {
      renewal_id: renewal.id,
      document_id,
      status: "pending",
      message: "Renewal request sent to contractor",
    };
  });

/**
 * Get compliance status for contractor
 * Returns overall compliance status and expiring documents
 */
export const getContractorComplianceStatus = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        contractor_id: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id } = input;

    // Get all documents
    const { data: documents, error: doc_error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("contractor_id", contractor_id);

    if (doc_error) throw new Error("Failed to fetch documents");

    // Calculate compliance status
    const verified_count = documents.filter((d) => d.status === "verified").length;
    const expired_count = documents.filter((d) => d.status === "expired").length;
    const invalid_count = documents.filter((d) => d.status === "invalid").length;

    let overall_status = "compliant";
    if (expired_count > 0 || invalid_count > 0) overall_status = "non_compliant";
    if (documents.length === 0) overall_status = "incomplete";

    return {
      contractor_id,
      overall_status,
      verified: verified_count,
      expired: expired_count,
      invalid: invalid_count,
      total: documents.length,
      documents,
    };
  });
