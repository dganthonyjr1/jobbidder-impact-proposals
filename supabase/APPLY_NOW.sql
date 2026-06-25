-- ============================================================================
-- JOBBIDDER.IO — Contractor Recruitment Feature
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
