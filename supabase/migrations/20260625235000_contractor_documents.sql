-- ============================================================================
-- JOBBIDDER.IO — Contractor Documents & Renewal Requests
-- Backs the AI-powered pre-qualification verification system
-- ============================================================================

-- contractor_documents: one row per uploaded credential
CREATE TABLE IF NOT EXISTS contractor_documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id    UUID        NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  document_type    TEXT        NOT NULL CHECK (document_type IN (
                                 'license',
                                 'gc_license',
                                 'electrical_license',
                                 'plumbing_license',
                                 'roofing_license',
                                 'specialty_license',
                                 'liability_insurance',
                                 'workers_comp',
                                 'surety_bond'
                               )),
  file_url         TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  file_mime        TEXT,
  -- AI-extracted fields (populated by document-ai.server.ts)
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','ai_extracted','verified','expired','invalid','needs_review')),
  extracted_data   JSONB       NOT NULL DEFAULT '{}',
  ai_confidence    DECIMAL(5,2),
  -- Top-level denormalised fields for fast queries/filters
  expiration_date  DATE,
  coverage_amount  BIGINT,          -- dollars (not cents)
  license_number   TEXT,
  issuer_name      TEXT,
  holder_name      TEXT,
  state_code       TEXT,
  -- Human review
  verified_at      TIMESTAMPTZ,
  verified_by      UUID        REFERENCES auth.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contractor_docs_contractor_idx  ON contractor_documents(contractor_id);
CREATE INDEX IF NOT EXISTS contractor_docs_type_idx        ON contractor_documents(document_type);
CREATE INDEX IF NOT EXISTS contractor_docs_status_idx      ON contractor_documents(status);
CREATE INDEX IF NOT EXISTS contractor_docs_expiry_idx      ON contractor_documents(expiration_date);

ALTER TABLE contractor_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='contractor_documents'
    AND policyname='Authenticated users can view contractor documents'
  ) THEN
    CREATE POLICY "Authenticated users can view contractor documents"
      ON contractor_documents FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='contractor_documents'
    AND policyname='Service role can manage contractor documents'
  ) THEN
    CREATE POLICY "Service role can manage contractor documents"
      ON contractor_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='update_contractor_documents_updated_at'
  ) THEN
    CREATE TRIGGER update_contractor_documents_updated_at
      BEFORE UPDATE ON contractor_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- document_renewal_requests: tracks when NGS requests a re-upload
CREATE TABLE IF NOT EXISTS document_renewal_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID        NOT NULL REFERENCES contractor_documents(id) ON DELETE CASCADE,
  contractor_id    UUID        NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  document_type    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','fulfilled','expired')),
  sms_sent         BOOLEAN     NOT NULL DEFAULT false,
  email_sent       BOOLEAN     NOT NULL DEFAULT false,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at     TIMESTAMPTZ,
  new_document_id  UUID        REFERENCES contractor_documents(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doc_renewal_contractor_idx ON document_renewal_requests(contractor_id);
CREATE INDEX IF NOT EXISTS doc_renewal_doc_idx        ON document_renewal_requests(document_id);
CREATE INDEX IF NOT EXISTS doc_renewal_status_idx     ON document_renewal_requests(status);

ALTER TABLE document_renewal_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='document_renewal_requests'
    AND policyname='Service role can manage renewal requests'
  ) THEN
    CREATE POLICY "Service role can manage renewal requests"
      ON document_renewal_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- voice_prequal_calls: stores GHL voice agent results before human sees contractor
CREATE TABLE IF NOT EXISTS voice_prequal_calls (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id        UUID        REFERENCES contractor_applications(id) ON DELETE SET NULL,
  phone                TEXT        NOT NULL,
  ghl_contact_id       TEXT,
  call_disposition     TEXT        NOT NULL DEFAULT 'unknown'
                                   CHECK (call_disposition IN ('qualified','not_qualified','no_answer','callback','unknown')),
  -- Survey answers captured by voice agent
  years_in_business    TEXT,
  has_gc_license       TEXT,
  has_liability_ins    TEXT,
  has_workers_comp     TEXT,
  has_surety_bond      TEXT,
  states_licensed      TEXT,
  crew_size            TEXT,
  raw_payload          JSONB       NOT NULL DEFAULT '{}',
  -- Outcome
  sms_upload_link_sent BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_prequal_phone_idx       ON voice_prequal_calls(phone);
CREATE INDEX IF NOT EXISTS voice_prequal_contractor_idx  ON voice_prequal_calls(contractor_id);
CREATE INDEX IF NOT EXISTS voice_prequal_ghl_idx         ON voice_prequal_calls(ghl_contact_id);

ALTER TABLE voice_prequal_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='voice_prequal_calls'
    AND policyname='Authenticated users can view voice prequal calls'
  ) THEN
    CREATE POLICY "Authenticated users can view voice prequal calls"
      ON voice_prequal_calls FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='voice_prequal_calls'
    AND policyname='Service role can manage voice prequal calls'
  ) THEN
    CREATE POLICY "Service role can manage voice prequal calls"
      ON voice_prequal_calls FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT 'contractor_documents, document_renewal_requests, voice_prequal_calls ready' AS status;
