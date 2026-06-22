CREATE TABLE IF NOT EXISTS contractor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  trade_type TEXT,
  years_experience TEXT,
  service_area TEXT,
  license_number TEXT,
  license_url TEXT,
  insurance_url TEXT,
  additional_doc_urls JSONB NOT NULL DEFAULT '[]',
  agrees_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'pending_docs')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contractor_applications_ghl_idx
  ON contractor_applications (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contractor_applications_status_idx
  ON contractor_applications (status, created_at);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-docs',
  'contractor-docs',
  true,
  20971520,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "contractor_docs_insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'contractor-docs');

CREATE POLICY "contractor_docs_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'contractor-docs');
