-- ============================================================================
-- JOBBIDDER.IO — Contractor Recruitment + Document Verification
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run (F5)
-- ============================================================================

-- contractor_recruits table
CREATE TABLE IF NOT EXISTS contractor_recruits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  phone            TEXT,
  email            TEXT,
  trade_type       TEXT,
  service_niche    TEXT,
  service_state    TEXT,
  source           TEXT        NOT NULL DEFAULT 'api',
  source_ref       TEXT,
  ghl_contact_id   TEXT,
  invite_sent_at   TIMESTAMPTZ,
  invite_method    TEXT,
  application_id   UUID        REFERENCES contractor_applications(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'invited'
                               CHECK (status IN ('invited', 'applied', 'declined', 'unresponsive')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add service_niche if table already exists without it
ALTER TABLE contractor_recruits
  ADD COLUMN IF NOT EXISTS service_niche TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS contractor_recruits_status_idx    ON contractor_recruits(status);
CREATE INDEX IF NOT EXISTS contractor_recruits_state_idx     ON contractor_recruits(service_state);
CREATE INDEX IF NOT EXISTS contractor_recruits_trade_idx     ON contractor_recruits(trade_type);
CREATE INDEX IF NOT EXISTS contractor_recruits_niche_idx     ON contractor_recruits(service_niche);
CREATE INDEX IF NOT EXISTS contractor_recruits_ghl_idx       ON contractor_recruits(ghl_contact_id);
CREATE INDEX IF NOT EXISTS contractor_recruits_created_idx   ON contractor_recruits(created_at);

-- Row Level Security
ALTER TABLE contractor_recruits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_recruits'
      AND policyname = 'Authenticated users can view contractor recruits'
  ) THEN
    CREATE POLICY "Authenticated users can view contractor recruits"
      ON contractor_recruits FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_recruits'
      AND policyname = 'Service role can manage contractor recruits'
  ) THEN
    CREATE POLICY "Service role can manage contractor recruits"
      ON contractor_recruits FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto-update updated_at (uses existing function from earlier migrations)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_contractor_recruits_updated_at'
  ) THEN
    CREATE TRIGGER update_contractor_recruits_updated_at
      BEFORE UPDATE ON contractor_recruits
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Column comment
COMMENT ON COLUMN contractor_recruits.service_niche IS
  'NGS niche slug: window-film-installation | commercial-glazing | building-perimeter-hardening | energy-modeling | sustainability-consulting | glass-fabrication | project-management | national-retail-rollouts | energy-grant-consulting | etc.';

SELECT 'contractor_recruits table ready' AS status;


-- ============================================================================
-- Contractor Documents + Verification Tables (migration 20260625235000)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id    UUID        NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  document_type    TEXT        NOT NULL CHECK (document_type IN (
                                 'license','gc_license','electrical_license','plumbing_license',
                                 'roofing_license','specialty_license',
                                 'liability_insurance','workers_comp','surety_bond'
                               )),
  file_url         TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  file_mime        TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','ai_extracted','verified','expired','invalid','needs_review')),
  extracted_data   JSONB       NOT NULL DEFAULT '{}',
  ai_confidence    DECIMAL(5,2),
  expiration_date  DATE,
  coverage_amount  BIGINT,
  license_number   TEXT,
  issuer_name      TEXT,
  holder_name      TEXT,
  state_code       TEXT,
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contractor_documents' AND policyname='Authenticated users can view contractor documents') THEN
    CREATE POLICY "Authenticated users can view contractor documents" ON contractor_documents FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contractor_documents' AND policyname='Service role can manage contractor documents') THEN
    CREATE POLICY "Service role can manage contractor documents" ON contractor_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_contractor_documents_updated_at') THEN
    CREATE TRIGGER update_contractor_documents_updated_at BEFORE UPDATE ON contractor_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_renewal_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID        NOT NULL REFERENCES contractor_documents(id) ON DELETE CASCADE,
  contractor_id    UUID        NOT NULL REFERENCES contractor_applications(id) ON DELETE CASCADE,
  document_type    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','expired')),
  sms_sent         BOOLEAN     NOT NULL DEFAULT false,
  email_sent       BOOLEAN     NOT NULL DEFAULT false,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at     TIMESTAMPTZ,
  new_document_id  UUID        REFERENCES contractor_documents(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doc_renewal_contractor_idx ON document_renewal_requests(contractor_id);
CREATE INDEX IF NOT EXISTS doc_renewal_doc_idx        ON document_renewal_requests(document_id);

ALTER TABLE document_renewal_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='document_renewal_requests' AND policyname='Service role can manage renewal requests') THEN
    CREATE POLICY "Service role can manage renewal requests" ON document_renewal_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS voice_prequal_calls (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id        UUID        REFERENCES contractor_applications(id) ON DELETE SET NULL,
  phone                TEXT        NOT NULL,
  ghl_contact_id       TEXT,
  call_disposition     TEXT        NOT NULL DEFAULT 'unknown' CHECK (call_disposition IN ('qualified','not_qualified','no_answer','callback','unknown')),
  years_in_business    TEXT,
  has_gc_license       TEXT,
  has_liability_ins    TEXT,
  has_workers_comp     TEXT,
  has_surety_bond      TEXT,
  states_licensed      TEXT,
  crew_size            TEXT,
  raw_payload          JSONB       NOT NULL DEFAULT '{}',
  sms_upload_link_sent BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_prequal_phone_idx      ON voice_prequal_calls(phone);
CREATE INDEX IF NOT EXISTS voice_prequal_contractor_idx ON voice_prequal_calls(contractor_id);

ALTER TABLE voice_prequal_calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_prequal_calls' AND policyname='Authenticated users can view voice prequal calls') THEN
    CREATE POLICY "Authenticated users can view voice prequal calls" ON voice_prequal_calls FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_prequal_calls' AND policyname='Service role can manage voice prequal calls') THEN
    CREATE POLICY "Service role can manage voice prequal calls" ON voice_prequal_calls FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT 'All tables ready' AS status;


-- ============================================================================
-- Client Deals (CRM Pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_deals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT        NOT NULL,
  contact_name     TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  deal_value       BIGINT,
  stage            TEXT        NOT NULL DEFAULT 'lead'
                               CHECK (stage IN ('lead','meeting','proposal','negotiating','won','lost')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_deals_stage_idx   ON client_deals(stage);
CREATE INDEX IF NOT EXISTS client_deals_created_idx ON client_deals(created_at);

ALTER TABLE client_deals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_deals' AND policyname='Authenticated users can view client deals') THEN
    CREATE POLICY "Authenticated users can view client deals" ON client_deals FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_deals' AND policyname='Service role can manage client deals') THEN
    CREATE POLICY "Service role can manage client deals" ON client_deals FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_client_deals_updated_at') THEN
    CREATE TRIGGER update_client_deals_updated_at BEFORE UPDATE ON client_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'client_deals table ready' AS status;
