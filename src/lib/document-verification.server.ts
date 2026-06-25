/**
 * ============================================================================
 * JOBBIDDER.IO — Contractor Document Verification
 * Server functions for AI-powered credential checking
 * ============================================================================
 */

import { createServerFn } from "@tanstack/start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { extractDocumentData, determineVerificationStatus, type DocType } from "./document-ai.server";
import { sendSmsViaGHL } from "./ghl.server";

export type DocumentType = DocType;

export type DocumentVerification = {
  document_id: string;
  contractor_id: string;
  document_type: DocumentType;
  file_url: string;
  status: "pending" | "ai_extracted" | "verified" | "expired" | "invalid" | "needs_review";
  extracted_data: Record<string, any>;
  expiration_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
};

/** Register a newly-uploaded document and trigger AI extraction. */
export const uploadContractorDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      contractor_id: z.string().uuid(),
      document_type: z.enum([
        "license", "gc_license", "electrical_license", "plumbing_license",
        "roofing_license", "specialty_license",
        "liability_insurance", "workers_comp", "surety_bond",
      ]),
      file_url: z.string().url(),
      file_name: z.string(),
      file_mime: z.string().default("application/octet-stream"),
    }).parse(input)
  )
  .handler(async ({ input }) => {
    const { contractor_id, document_type, file_url, file_name, file_mime } = input;

    // Run AI extraction immediately (sync for simplicity; move to queue for scale)
    const extracted = await extractDocumentData(file_url, document_type as DocType, file_mime);
    const status = determineVerificationStatus(extracted, document_type as DocType);

    const { data: doc, error } = await supabaseAdmin
      .from("contractor_documents")
      .insert({
        contractor_id,
        document_type,
        file_url,
        file_name,
        file_mime,
        status,
        extracted_data: extracted as any,
        ai_confidence: extracted.confidence,
        expiration_date: extracted.expiration_date ?? null,
        coverage_amount: extracted.coverage_amount ?? null,
        license_number: extracted.license_number ?? null,
        issuer_name: extracted.issuer_name ?? null,
        holder_name: extracted.holder_name ?? null,
        state_code: extracted.state_code ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Document upload failed: ${error.message}`);

    // Compliance audit trail
    await supabaseAdmin.from("compliance_audit_trail").insert({
      contractor_id,
      event_type: "document_uploaded",
      document_type: document_type === "liability_insurance" ? "coi" : document_type as any,
      status: status as any,
      details: { document_id: doc.id, ai_confidence: extracted.confidence, file_name },
      created_by: contractor_id,
    }).catch(() => { /* audit trail is best-effort */ });

    return {
      document_id: doc.id,
      status,
      ai_confidence: extracted.confidence,
      message: status === "needs_review"
        ? "Document uploaded — queued for manual review"
        : `Document uploaded and ${status === "ai_extracted" ? "auto-verified by AI" : status}`,
    };
  });

/** Admin: manually approve or reject a document after reviewing AI extraction. */
export const adminVerifyDocument = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      document_id: z.string().uuid(),
      verdict: z.enum(["verified", "invalid", "needs_review"]),
      notes: z.string().optional(),
    }).parse(input)
  )
  .handler(async ({ input }) => {
    const { document_id, verdict, notes } = input;

    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from("contractor_documents")
      .select("contractor_id, document_type")
      .eq("id", document_id)
      .single();

    if (fetchErr) throw new Error("Document not found");

    const { error } = await supabaseAdmin
      .from("contractor_documents")
      .update({
        status: verdict,
        notes: notes ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (error) throw new Error("Failed to update document");

    await supabaseAdmin.from("compliance_audit_trail").insert({
      contractor_id: doc.contractor_id,
      event_type: verdict === "verified" ? "document_verified" : "compliance_check_failed",
      document_type: doc.document_type as any,
      status: verdict as any,
      details: { document_id, notes },
      created_by: doc.contractor_id,
    }).catch(() => {});

    return { document_id, status: verdict };
  });

/** Get all documents for a contractor. */
export const getContractorDocuments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ contractor_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ input }) => {
    const { data: documents, error } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("contractor_id", input.contractor_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch documents");
    return { contractor_id: input.contractor_id, documents: documents ?? [], total: documents?.length ?? 0 };
  });

/** Get all contractors with their compliance roll-up for the admin dashboard. */
export const getAllContractorsWithCompliance = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: contractors, error } = await supabaseAdmin
      .from("contractor_applications")
      .select(`
        id, name, phone, email, trade_type, service_area, status, created_at,
        qualification_status, qualification_score,
        contractor_documents ( id, document_type, status, expiration_date, holder_name, license_number, issuer_name, coverage_amount, ai_confidence, file_url, file_name, notes, verified_at, extracted_data )
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch contractors: ${error.message}`);
    return contractors ?? [];
  });

/** Get documents expiring within N days across all contractors. */
export const checkExpiringDocuments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({
      contractor_id: z.string().uuid().optional(),
      days_until_expiration: z.number().default(30),
    }).parse(input)
  )
  .handler(async ({ input }) => {
    const threshold = new Date(Date.now() + input.days_until_expiration * 86_400_000).toISOString();

    let q = supabaseAdmin
      .from("contractor_documents")
      .select("*, contractor_applications(name, phone, email)")
      .lte("expiration_date", threshold)
      .gte("expiration_date", new Date().toISOString())
      .order("expiration_date", { ascending: true });

    if (input.contractor_id) q = q.eq("contractor_id", input.contractor_id);

    const { data: documents, error } = await q;
    if (error) throw new Error("Failed to fetch expiring documents");
    return { expiring_documents: documents ?? [], total: documents?.length ?? 0 };
  });

/** Send an SMS to a contractor asking them to re-upload an expiring/expired document. */
export const requestDocumentRenewal = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      document_id: z.string().uuid(),
      contractor_id: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ input }) => {
    const { document_id, contractor_id } = input;

    const [{ data: doc }, { data: contractor }] = await Promise.all([
      supabaseAdmin.from("contractor_documents").select("document_type").eq("id", document_id).single(),
      supabaseAdmin.from("contractor_applications").select("name, phone").eq("id", contractor_id).single(),
    ]);

    if (!doc) throw new Error("Document not found");
    if (!contractor?.phone) throw new Error("Contractor phone not found");

    const siteUrl = process.env.VITE_SITE_URL ?? "https://jobbidder.io";
    const msg = `Hi ${contractor.name ?? "there"}! Your ${doc.document_type.replace(/_/g, " ")} on file with NGS is expiring or needs renewal. Please re-upload at: ${siteUrl}/contractor-apply`;

    let smsSent = false;
    try {
      await sendSmsViaGHL(
        { apiToken: process.env.GHL_API_TOKEN!, locationId: process.env.GHL_LOCATION_ID!, fromNumber: process.env.GHL_FROM_NUMBER! },
        contractor.phone,
        msg
      );
      smsSent = true;
    } catch { /* log but don't throw — renewal request still recorded */ }

    const { data: renewal } = await supabaseAdmin
      .from("document_renewal_requests")
      .insert({ document_id, contractor_id, document_type: doc.document_type, sms_sent: smsSent })
      .select()
      .single();

    await supabaseAdmin.from("compliance_audit_trail").insert({
      contractor_id,
      event_type: "renewal_requested",
      document_type: doc.document_type as any,
      status: "pending",
      details: { document_id, renewal_id: renewal?.id, sms_sent: smsSent },
      created_by: contractor_id,
    }).catch(() => {});

    return { renewal_id: renewal?.id, sms_sent: smsSent, message: "Renewal request created" };
  });

/** Compliance roll-up for a single contractor. */
export const getContractorComplianceStatus = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ contractor_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ input }) => {
    const { data: documents } = await supabaseAdmin
      .from("contractor_documents")
      .select("*")
      .eq("contractor_id", input.contractor_id);

    const docs = documents ?? [];
    const verified = docs.filter((d) => d.status === "verified").length;
    const expired  = docs.filter((d) => d.status === "expired").length;
    const invalid  = docs.filter((d) => d.status === "invalid").length;
    const pending  = docs.filter((d) => d.status === "pending" || d.status === "needs_review").length;

    const overall_status =
      docs.length === 0            ? "incomplete"
      : expired > 0 || invalid > 0 ? "non_compliant"
      : pending > 0                 ? "pending"
      : "compliant";

    return { contractor_id: input.contractor_id, overall_status, verified, expired, invalid, pending, total: docs.length, documents: docs };
  });
