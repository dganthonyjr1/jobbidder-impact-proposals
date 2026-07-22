/**
 * Knowledge Base (RAG) — server functions.
 *
 * The "central intelligence" gap from the NGS spec (§4): search across every
 * uploaded document and answer a question WITH citations. This module is the
 * single-account version — everything buildable without NGS's real org structure
 * or corpus. Department scoping is stubbed (column exists, always NULL) until the
 * organization layer is built with NGS.
 *
 * Pipeline:
 *   ingest:  text (or PDF url) -> chunk (rag-chunk) -> embed (embeddings.server)
 *            -> store kb_documents + kb_chunks
 *   ask:     question -> embed -> match_kb_chunks (pgvector, contractor-scoped)
 *            -> Claude writes an answer that cites the retrieved passages
 *
 * Every DB touch is scoped to the contractor resolved from the authenticated
 * user — the same trust model as generateProposal etc. Feature-flagged: off by
 * default, so this ships dark and changes nothing until enabled.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { chunkText } from "./rag-chunk";
import { embedTexts, embedQuery, embeddingsConfigured } from "./embeddings.server";

/** Is the knowledge base turned on? Global env kill-switch OR per-contractor pilot. */
export function isRagEnabled(contractor?: { pricing_settings?: unknown } | null): boolean {
  if (process.env.RAG_ENABLED === "true") return true;
  const ps = contractor?.pricing_settings as { use_knowledge_base?: boolean } | undefined;
  return ps?.use_knowledge_base === true;
}

/** Resolve the caller's contractor row (id + pricing_settings for the flag). */
async function resolveContractor(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("contractors")
    .select("id, pricing_settings")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error(`Contractor profile not found: ${error?.message ?? "no row"}`);
  return data;
}

/** Pull the text layer out of a PDF buffer (same approach as document-ai.server.ts). */
async function pdfBufferToText(buf: Buffer): Promise<string> {
  // @ts-expect-error - pdf-parse ships no type declarations for the /lib subpath
  const pdfMod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (pdfMod as any).default as (b: Buffer) => Promise<{ text?: string }>;
  const pdf = await pdfParse(buf).catch(() => null);
  return (pdf?.text || "").trim();
}

async function extractPdfTextFromUrl(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Could not fetch document (${res.status})`);
  return pdfBufferToText(Buffer.from(await res.arrayBuffer()));
}

/** Read a PDF that the browser already uploaded to Supabase storage. */
async function extractPdfTextFromStorage(bucket: string, path: string): Promise<string> {
  const { data: file, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !file) throw new Error(`Could not read uploaded file: ${error?.message || "not found"}`);
  return pdfBufferToText(Buffer.from(await file.arrayBuffer()));
}

interface IngestMeta {
  title: string;
  source_type: "upload" | "spec" | "proposal" | "credential" | "note";
  source_id?: string | null;
  file_url?: string | null;
  file_mime?: string | null;
}

/**
 * Shared ingestion core: chunk -> embed -> store. Creates the kb_documents row
 * first (status 'processing') so a failure is visible and retryable rather than
 * silent, and returns to 'failed' with the error message if anything throws.
 *
 * When source_id is set (e.g. an existing proposal), any previous copy for the
 * same (contractor, source_type, source_id) is removed first so re-indexing
 * replaces rather than duplicates. Assumes the flag + embeddings checks have
 * already passed (callers are all authenticated server functions).
 */
async function ingestTextForContractor(
  contractorId: string,
  uploadedBy: string,
  meta: IngestMeta,
  rawText: string,
): Promise<{ document_id: string; chunks: number; status: "indexed" }> {
  const text = (rawText || "").trim();
  if (!text || text.replace(/\s/g, "").length < 30) {
    throw new Error("No readable text found in the document (a scanned PDF needs OCR first).");
  }

  // Replace any prior copy of the same source record.
  if (meta.source_id) {
    await supabaseAdmin
      .from("kb_documents")
      .delete()
      .eq("contractor_id", contractorId)
      .eq("source_type", meta.source_type)
      .eq("source_id", meta.source_id);
  }

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("kb_documents")
    .insert({
      contractor_id: contractorId,
      title: meta.title,
      source_type: meta.source_type,
      source_id: meta.source_id ?? null,
      file_url: meta.file_url ?? null,
      file_mime: meta.file_mime ?? null,
      status: "processing",
      char_count: text.length,
      uploaded_by: uploadedBy,
    })
    .select("id")
    .single();
  if (docErr || !doc) throw new Error(`Failed to create document: ${docErr?.message}`);

  try {
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("Document produced no chunks.");

    const vectors = await embedTexts(chunks.map((c) => c.content));
    if (vectors.length !== chunks.length) {
      throw new Error(`Embedding count mismatch (${vectors.length} vs ${chunks.length}).`);
    }

    const rows = chunks.map((c, i) => ({
      document_id: doc.id,
      contractor_id: contractorId,
      department: null as string | null,
      chunk_index: c.index,
      content: c.content,
      heading: c.heading ?? null,
      token_estimate: c.tokenEstimate,
      embedding: vectors[i] as unknown as string, // pgvector accepts a JSON number[]
    }));

    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: chErr } = await supabaseAdmin.from("kb_chunks").insert(rows.slice(i, i + BATCH));
      if (chErr) throw new Error(`Failed to store chunks: ${chErr.message}`);
    }

    await supabaseAdmin.from("kb_documents").update({ status: "indexed", chunk_count: chunks.length }).eq("id", doc.id);
    return { document_id: doc.id, chunks: chunks.length, status: "indexed" };
  } catch (e) {
    const message = (e as Error).message;
    await supabaseAdmin.from("kb_documents").update({ status: "failed", error: message }).eq("id", doc.id);
    throw new Error(`Ingestion failed: ${message}`);
  }
}

const ingestSchema = z.object({
  title: z.string().min(1).max(300),
  source_type: z.enum(["upload", "spec", "proposal", "credential", "note"]).default("upload"),
  // Provide ONE of: raw text, a storage_path (a PDF the browser uploaded to the
  // 'proposal-specs' bucket), or a public file_url to fetch + parse server-side.
  text: z.string().optional(),
  storage_path: z.string().max(500).optional(),
  storage_bucket: z.string().max(100).default("proposal-specs"),
  file_url: z.string().url().optional(),
  file_mime: z.string().optional(),
});

/** Ingest one document (pasted text, an uploaded PDF, or a PDF url). */
export const ingestKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ingestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const contractor = await resolveContractor(context.userId);
    if (!isRagEnabled(contractor)) throw new Error("Knowledge base is not enabled for this account.");
    if (!embeddingsConfigured()) {
      throw new Error("Knowledge base is enabled but no embeddings provider key is set (OPENAI_API_KEY / VOYAGE_API_KEY).");
    }

    let text = (data.text || "").trim();
    if (!text && data.storage_path) text = await extractPdfTextFromStorage(data.storage_bucket, data.storage_path);
    if (!text && data.file_url) text = await extractPdfTextFromUrl(data.file_url);

    return ingestTextForContractor(contractor.id, context.userId, {
      title: data.title,
      source_type: data.source_type,
      file_url: data.file_url ?? null,
      file_mime: data.file_mime ?? null,
    }, text);
  });

/** Flatten a proposal row into plain searchable text. */
function proposalToText(p: any): string {
  const lines: string[] = [];
  lines.push(`Proposal ${p.proposal_number ?? ""} — ${p.client_name ?? "Client"}`.trim());
  if (p.job_address) lines.push(`Job address: ${p.job_address}`);
  if (p.trade_type) lines.push(`Trade: ${p.trade_type}`);
  if (p.status) lines.push(`Status: ${p.status}`);
  if (p.job_description) lines.push(`\nJob description:\n${p.job_description}`);
  if (p.scope_of_work) lines.push(`\nScope of work:\n${p.scope_of_work}`);
  if (p.timeline) lines.push(`\nTimeline: ${p.timeline}`);
  if (p.warranty) lines.push(`Warranty: ${p.warranty}`);
  const mats = Array.isArray(p.materials) ? p.materials : [];
  if (mats.length) {
    lines.push(`\nMaterials:`);
    for (const m of mats) lines.push(`- ${[m?.item, m?.description, m?.qty && `qty ${m.qty} ${m.unit ?? ""}`].filter(Boolean).join(" · ")}`);
  }
  const labor = Array.isArray(p.labor) ? p.labor : [];
  if (labor.length) {
    lines.push(`\nLabor:`);
    for (const l of labor) lines.push(`- ${[l?.task, l?.description, l?.hours && `${l.hours} hrs`].filter(Boolean).join(" · ")}`);
  }
  const excl = Array.isArray(p.exclusions) ? p.exclusions : [];
  if (excl.length) lines.push(`\nExclusions:\n${excl.map((e: any) => `- ${typeof e === "string" ? e : JSON.stringify(e)}`).join("\n")}`);
  return lines.join("\n");
}

/**
 * Pre-load the knowledge base with the contractor's existing proposals, so there
 * is something to search on day one instead of an empty box. Idempotent: a
 * proposal already indexed (by source_id) is refreshed, not duplicated. Skips
 * proposals with too little text to be useful. Returns a per-proposal summary.
 */
export const indexExistingProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().min(1).max(500).default(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const contractor = await resolveContractor(context.userId);
    if (!isRagEnabled(contractor)) throw new Error("Knowledge base is not enabled for this account.");
    if (!embeddingsConfigured()) throw new Error("Knowledge base has no embeddings provider configured.");

    const { data: proposals, error } = await supabaseAdmin
      .from("proposals")
      .select("id, proposal_number, client_name, job_address, trade_type, status, job_description, scope_of_work, timeline, warranty, materials, labor, exclusions, created_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(`Could not load proposals: ${error.message}`);

    let indexed = 0;
    let skipped = 0;
    let failed = 0;
    for (const p of proposals ?? []) {
      const text = proposalToText(p);
      if (text.replace(/\s/g, "").length < 120) { skipped++; continue; }
      try {
        await ingestTextForContractor(contractor.id, context.userId, {
          title: `Proposal ${p.proposal_number ?? p.id} — ${p.client_name ?? "Client"}`,
          source_type: "proposal",
          source_id: p.id,
        }, text);
        indexed++;
      } catch (e) {
        console.error(`[indexExistingProposals] ${p.id} failed:`, (e as Error).message);
        failed++;
      }
    }
    return { total: proposals?.length ?? 0, indexed, skipped, failed };
  });

/** List the caller's knowledge documents (newest first). */
export const listKnowledgeDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const contractor = await resolveContractor(context.userId);
    const { data, error } = await supabaseAdmin
      .from("kb_documents")
      .select("id, title, source_type, status, chunk_count, char_count, error, created_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to list documents: ${error.message}`);
    return {
      enabled: isRagEnabled(contractor),
      embeddings_ready: embeddingsConfigured(),
      documents: data ?? [],
    };
  });

/** Delete one of the caller's documents (chunks cascade). */
export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ document_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const contractor = await resolveContractor(context.userId);
    const { error } = await supabaseAdmin
      .from("kb_documents")
      .delete()
      .eq("id", data.document_id)
      .eq("contractor_id", contractor.id); // defense-in-depth: only your own
    if (error) throw new Error(`Failed to delete document: ${error.message}`);
    return { ok: true };
  });

export interface KbCitation {
  ref: number;
  document_id: string;
  title: string;
  page: number | null;
  heading: string | null;
  snippet: string;
}

/**
 * Ask a question of the caller's documents. Retrieves the most relevant chunks
 * (contractor-scoped, via match_kb_chunks), then Claude writes an answer that
 * cites them by [n]. Returns the answer plus the resolved citation list so the
 * UI can show sources. If nothing relevant is found, says so rather than guessing.
 */
export const askKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ question: z.string().min(3).max(1000), match_count: z.number().min(1).max(20).default(8) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ answer: string; citations: KbCitation[]; used_chunks: number }> => {
    const contractor = await resolveContractor(context.userId);
    if (!isRagEnabled(contractor)) throw new Error("Knowledge base is not enabled for this account.");
    if (!embeddingsConfigured()) throw new Error("Knowledge base has no embeddings provider configured.");

    const queryVec = await embedQuery(data.question);

    const { data: matches, error: matchErr } = await supabaseAdmin.rpc("match_kb_chunks", {
      query_embedding: queryVec as unknown as string,
      p_contractor_id: contractor.id,
      match_count: data.match_count,
      p_department: undefined,
    });
    if (matchErr) throw new Error(`Search failed: ${matchErr.message}`);

    const hits = (matches ?? []) as {
      id: string; document_id: string; content: string; page: number | null; heading: string | null; similarity: number;
    }[];

    if (hits.length === 0) {
      return {
        answer: "I couldn't find anything in your uploaded documents that answers that. Try rephrasing, or add the relevant document to your knowledge base.",
        citations: [],
        used_chunks: 0,
      };
    }

    // Resolve document titles for citation display.
    const docIds = [...new Set(hits.map((h) => h.document_id))];
    const { data: docs } = await supabaseAdmin
      .from("kb_documents")
      .select("id, title")
      .in("id", docIds);
    const titleById = new Map((docs ?? []).map((d) => [d.id, d.title]));

    const citations: KbCitation[] = hits.map((h, i) => ({
      ref: i + 1,
      document_id: h.document_id,
      title: titleById.get(h.document_id) ?? "Untitled document",
      page: h.page,
      heading: h.heading,
      snippet: h.content.slice(0, 240),
    }));

    const contextBlock = hits
      .map((h, i) => {
        const loc = [titleById.get(h.document_id) ?? "document", h.page ? `p.${h.page}` : null, h.heading]
          .filter(Boolean)
          .join(", ");
        return `[${i + 1}] (${loc})\n${h.content}`;
      })
      .join("\n\n");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set — cannot generate an answer.");
    const claude = new Anthropic({ apiKey });

    const system =
      "You answer questions using ONLY the provided document excerpts. Cite every claim with the bracketed " +
      "number of the excerpt it comes from, like [1] or [2][3]. If the excerpts do not contain the answer, say so " +
      "plainly — never invent facts or use outside knowledge. Be concise and specific.";

    const userMsg = `QUESTION:\n${data.question}\n\nDOCUMENT EXCERPTS:\n${contextBlock}`;

    const completion = await claude.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    const answer = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Only return citations the model actually referenced (keeps the source list tight).
    const referenced = new Set<number>();
    for (const m of answer.matchAll(/\[(\d+)\]/g)) referenced.add(Number(m[1]));
    const usedCitations = referenced.size > 0 ? citations.filter((c) => referenced.has(c.ref)) : citations;

    return { answer, citations: usedCitations, used_chunks: hits.length };
  });
