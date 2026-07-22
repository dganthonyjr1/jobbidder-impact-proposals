/**
 * Document chunking for the knowledge base (RAG).
 *
 * Splitting a document into overlapping, semantically-whole pieces is what makes
 * retrieval work: too big and a match drags in irrelevant text, too small and it
 * loses the context that makes an answer correct. This module is pure (no I/O),
 * so it is fully unit-tested and deterministic.
 *
 * Strategy: pack whole paragraphs into chunks up to ~maxChars, keeping a small
 * tail overlap so a fact that straddles a boundary still survives in one chunk.
 * When a single paragraph is larger than maxChars it is hard-split on sentence
 * boundaries (then, as a last resort, on raw length).
 */

export interface Chunk {
  index: number;
  content: string;
  /** Best-effort heading this chunk falls under, for citations. */
  heading?: string;
  tokenEstimate: number;
}

export interface ChunkOptions {
  /** Target maximum characters per chunk (~4 chars/token). Default 3000 ≈ 750 tokens. */
  maxChars?: number;
  /** Characters of trailing overlap carried into the next chunk. Default 300. */
  overlapChars?: number;
  /** Minimum chars for a chunk to be kept on its own. Default 40. */
  minChars?: number;
}

/** Rough token estimate — good enough for budgeting, no tokenizer dependency. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** A line that looks like a heading (markdown #, ALL CAPS, or "SECTION 07 40 00"). */
function detectHeading(paragraph: string): string | undefined {
  const first = paragraph.split("\n")[0].trim();
  if (!first || first.length > 120) return undefined;
  if (/^#{1,6}\s+/.test(first)) return first.replace(/^#{1,6}\s+/, "").trim();
  if (/^(section|part|division|article)\b/i.test(first)) return first;
  // Short line in mostly upper-case with no ending punctuation.
  const letters = first.replace(/[^a-z]/gi, "");
  if (letters.length >= 3 && letters === letters.toUpperCase() && !/[.:;]$/.test(first)) {
    return first;
  }
  return undefined;
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  // Sentence-ish boundaries first.
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [paragraph];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && (buf + s).length > maxChars) {
      out.push(buf.trim());
      buf = "";
    }
    if (s.length > maxChars) {
      // A single monster sentence — hard-split on length.
      for (let i = 0; i < s.length; i += maxChars) out.push(s.slice(i, i + maxChars).trim());
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

export function chunkText(raw: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 3000;
  const overlapChars = options.overlapChars ?? 300;
  const minChars = options.minChars ?? 40;

  const text = (raw || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: Chunk[] = [];
  let buf = "";
  let currentHeading: string | undefined;
  let bufHeading: string | undefined;

  const flush = () => {
    const content = buf.trim();
    if (!content) return;
    chunks.push({
      index: chunks.length,
      content,
      heading: bufHeading,
      tokenEstimate: estimateTokens(content),
    });
    // Seed the next buffer with a tail overlap so cross-boundary facts survive.
    buf = overlapChars > 0 ? content.slice(-overlapChars) : "";
    bufHeading = currentHeading;
  };

  for (const para of paragraphs) {
    const h = detectHeading(para);
    if (h) currentHeading = h;
    if (!bufHeading) bufHeading = currentHeading;

    const pieces = para.length > maxChars ? splitLongParagraph(para, maxChars) : [para];
    for (const piece of pieces) {
      if (buf && (buf.length + piece.length + 2) > maxChars) flush();
      if (!bufHeading) bufHeading = currentHeading;
      buf = buf ? `${buf}\n\n${piece}` : piece;
    }
  }
  flush();

  // Merge a trailing sliver (mostly the overlap tail) back into the previous chunk.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.content.length < minChars) {
      const prev = chunks[chunks.length - 2];
      prev.content = `${prev.content}\n\n${last.content}`.trim();
      prev.tokenEstimate = estimateTokens(prev.content);
      chunks.pop();
    }
  }

  // Drop a lone sub-minimum chunk (nothing meaningful to embed).
  if (chunks.length === 1 && chunks[0].content.length < minChars) return [];

  return chunks;
}
