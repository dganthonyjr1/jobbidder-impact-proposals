-- De-duplication key for the knowledge base: when we index a record that already
-- lives in the system (e.g. an existing proposal), source_id lets a re-index
-- replace the previous copy instead of piling up duplicates. NULL for ad-hoc
-- uploads / pasted notes, which are always new.
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_source_unique
  ON kb_documents (contractor_id, source_type, source_id)
  WHERE source_id IS NOT NULL;
