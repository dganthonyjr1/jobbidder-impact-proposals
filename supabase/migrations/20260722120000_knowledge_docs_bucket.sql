-- Storage bucket for knowledge-base uploads (any supported file type: PDF, Word,
-- Excel/CSV, plain text, PowerPoint, email). Private; files are read server-side
-- by the service role during ingestion. MIME types are intentionally
-- unrestricted at the bucket level (browsers report these formats
-- inconsistently); the file type is validated in code by extension.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-docs', 'knowledge-docs', false, 26214400)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload into and read/delete ONLY their own folder
-- (first path segment = their user id), mirroring the proposal-specs pattern.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='knowledge_docs_insert_own') THEN
    CREATE POLICY "knowledge_docs_insert_own" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'knowledge-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='knowledge_docs_select_own') THEN
    CREATE POLICY "knowledge_docs_select_own" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'knowledge-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='knowledge_docs_delete_own') THEN
    CREATE POLICY "knowledge_docs_delete_own" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'knowledge-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;
END $$;
