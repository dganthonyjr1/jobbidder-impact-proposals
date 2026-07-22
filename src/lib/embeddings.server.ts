/**
 * Text embeddings for the knowledge base (RAG).
 *
 * Provider-agnostic on purpose: the embedding model is the one piece we may want
 * to swap before ingesting a real corpus, so it lives behind a single function.
 * Default is OpenAI `text-embedding-3-small` (1536 dims), which matches the
 * vector(1536) column in the kb_chunks migration and uses the `openai` package
 * already in the project — no new dependency.
 *
 * Config (env):
 *   EMBEDDINGS_PROVIDER = "openai" | "voyage"   (default "openai")
 *   EMBEDDINGS_MODEL    = model id              (default per provider)
 *   OPENAI_API_KEY / VOYAGE_API_KEY             (whichever provider is selected)
 *
 * Voyage note: voyage-3 is 1024-dim, so switching to it also needs a follow-up
 * migration to re-type kb_chunks.embedding to vector(1024). embeddingDimensions()
 * exposes the current provider's dimension so the app can assert on it.
 */

const EMBED_DIM = 1536; // must equal the kb_chunks.embedding column dimension

type Provider = "openai" | "voyage";

function provider(): Provider {
  return (process.env.EMBEDDINGS_PROVIDER as Provider) || "openai";
}

function apiKey(p: Provider): string | undefined {
  if (p === "voyage") return process.env.VOYAGE_API_KEY;
  return process.env.OPENAI_API_KEY;
}

/** True when an embeddings provider is configured and ready to use. */
export function embeddingsConfigured(): boolean {
  return Boolean(apiKey(provider()));
}

/** Dimension the current provider/model emits (must match the DB column). */
export function embeddingDimensions(): number {
  return EMBED_DIM;
}

function defaultModel(p: Provider): string {
  return p === "voyage" ? "voyage-3" : "text-embedding-3-small";
}

async function embedOpenAI(texts: string[], model: string, key: string): Promise<number[][]> {
  // Reuse the already-installed openai package.
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: key });
  const res = await client.embeddings.create({
    model,
    input: texts,
    // text-embedding-3-* support a `dimensions` param; pin it to the column size
    // so text-embedding-3-large (native 3072) also fits vector(1536).
    dimensions: EMBED_DIM,
  });
  return res.data.map((d) => d.embedding as number[]);
}

async function embedVoyage(texts: string[], model: string, key: string): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw new Error(`Voyage embeddings failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

/**
 * Embed a batch of texts. Throws a clear, catchable error when no provider key
 * is configured — callers (ingestion) mark the document 'failed' rather than
 * crashing the request. Batches are capped to keep provider payloads sane.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const clean = texts.map((t) => (t || "").slice(0, 8000)).filter((t) => t.trim().length > 0);
  if (clean.length === 0) return [];

  const p = provider();
  const key = apiKey(p);
  if (!key) {
    throw new Error(
      `Embeddings not configured: set ${p === "voyage" ? "VOYAGE_API_KEY" : "OPENAI_API_KEY"} ` +
        `(and optionally EMBEDDINGS_PROVIDER/EMBEDDINGS_MODEL) to enable the knowledge base.`,
    );
  }
  const model = process.env.EMBEDDINGS_MODEL || defaultModel(p);

  const BATCH = 96;
  const out: number[][] = [];
  for (let i = 0; i < clean.length; i += BATCH) {
    const slice = clean.slice(i, i + BATCH);
    const vecs = p === "voyage" ? await embedVoyage(slice, model, key) : await embedOpenAI(slice, model, key);
    out.push(...vecs);
  }
  return out;
}

/** Embed a single query string; returns the raw vector. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  if (!vec) throw new Error("Failed to embed query text");
  return vec;
}
