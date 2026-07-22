-- ============================================================================
-- JOBBIDDER.IO — Knowledge Base / RAG (document search with cited answers)
-- ----------------------------------------------------------------------------
-- Turns uploaded documents into a searchable library: each document is split
-- into chunks, each chunk carries a vector embedding, and a similarity search
-- retrieves the passages most relevant to a question so an AI can answer WITH
-- citations back to the source document.
--
-- Scope of THIS migration (everything that needs no NGS involvement):
--   * pgvector extension
--   * kb_documents (one row per uploaded document, owned by a contractor)
--   * kb_chunks    (searchable pieces + embeddings, contractor_id denormalized
--                   onto each chunk so RLS + filtering are cheap)
--   * brand-new RLS on BOTH new tables (single-account isolation, mirroring the
--     cost_catalog pattern). Does NOT touch any RLS policy on proposals or
--     estimates — those stay exactly as hardened.
--   * match_kb_chunks() similarity-search function, contractor-scoped.
--
-- NOT in this migration (needs NGS's real org structure / documents):
--   * department/organization scoping (a `department` column is included now but
--     stays NULL until the org layer exists — nothing reads it yet)
--   * retrieval-quality tuning on NGS's actual corpus
--
-- Embedding dimension is 1536 (OpenAI text-embedding-3-small, the default in
-- embeddings.server.ts). Swapping to another model with a different dimension
-- means a follow-up migration to re-type the column; documented there.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ── kb_documents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_documents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  source_type    TEXT        NOT NULL DEFAULT 'upload'   -- upload | spec | proposal | credential | note
                             CHECK (source_type IN ('upload','spec','proposal','credential','note')),
  file_url       TEXT,
  file_mime      TEXT,
  -- Reserved for the future org/department layer (see §10). Stays NULL for now;
  -- nothing reads it until that layer exists — so it is inert, not a promise.
  department     TEXT,
  -- Ingestion lifecycle so the UI can show progress and retries are safe.
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','indexed','failed')),
  chunk_count    INTEGER     NOT NULL DEFAULT 0,
  char_count     INTEGER     NOT NULL DEFAULT 0,
  error          TEXT,
  uploaded_by    UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_documents_contractor_idx ON kb_documents(contractor_id);
CREATE INDEX IF NOT EXISTS kb_documents_status_idx     ON kb_documents(status);

-- ── kb_chunks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_chunks (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID         NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  -- Denormalized from the parent document so RLS and similarity filtering never
  -- need a join. Always kept in sync by the ingestion code (single writer).
  contractor_id  UUID         NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  department     TEXT,
  chunk_index    INTEGER      NOT NULL,       -- 0-based order within the document
  content        TEXT         NOT NULL,
  -- Citation anchors: whatever the source could give us (page for PDFs, a section
  -- heading when detectable). Both optional.
  page           INTEGER,
  heading        TEXT,
  token_estimate INTEGER,
  embedding      vector(1536),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_chunks_document_idx   ON kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS kb_chunks_contractor_idx ON kb_chunks(contractor_id);
-- HNSW cosine index for fast approximate nearest-neighbour search. HNSW needs no
-- training pass (unlike ivfflat), so it works fine on a table that starts empty.
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
  ON kb_chunks USING hnsw (embedding vector_cosine_ops);

-- ── Row-Level Security (new tables only) ────────────────────────────────────
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks    ENABLE ROW LEVEL SECURITY;

-- A contractor can read + manage ONLY their own documents.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kb_documents' AND policyname='Manage own kb documents') THEN
    CREATE POLICY "Manage own kb documents"
      ON kb_documents FOR ALL TO authenticated
      USING     (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()))
      WITH CHECK (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kb_documents' AND policyname='Service role manages kb documents') THEN
    CREATE POLICY "Service role manages kb documents"
      ON kb_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- A contractor can read ONLY the chunks of their own documents. Writes go through
-- the service role (ingestion), never the browser.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kb_chunks' AND policyname='Read own kb chunks') THEN
    CREATE POLICY "Read own kb chunks"
      ON kb_chunks FOR SELECT TO authenticated
      USING (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kb_chunks' AND policyname='Service role manages kb chunks') THEN
    CREATE POLICY "Service role manages kb chunks"
      ON kb_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_kb_documents_updated_at') THEN
    CREATE TRIGGER update_kb_documents_updated_at
      BEFORE UPDATE ON kb_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Similarity search ───────────────────────────────────────────────────────
-- Returns the closest chunks to a query embedding, HARD-scoped to one contractor
-- (the caller resolves contractor_id from the authenticated user, exactly like
-- every other server function here). p_department is reserved for the future org
-- layer: NULL (the only value written today) means "no department filter".
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  p_contractor_id UUID,
  match_count     INT     DEFAULT 8,
  p_department    TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  document_id UUID,
  content     TEXT,
  page        INTEGER,
  heading     TEXT,
  chunk_index INTEGER,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id, c.document_id, c.content, c.page, c.heading, c.chunk_index,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM kb_chunks c
  WHERE c.contractor_id = p_contractor_id
    AND c.embedding IS NOT NULL
    AND (p_department IS NULL OR c.department = p_department)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

SELECT 'kb_documents, kb_chunks, match_kb_chunks ready' AS status;
