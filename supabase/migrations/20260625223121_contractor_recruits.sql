-- ============================================================================
-- JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
-- Contractor Recruitment Outreach Table
-- Tracks proactively recruited glazing contractors before they formally apply
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_recruits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  phone            TEXT,
  email            TEXT,
  trade_type       TEXT,
  service_state    TEXT,               -- primary target state
  source           TEXT        NOT NULL DEFAULT 'api',  -- 'api' | 'manual' | 'licensing_board' | 'referral'
  source_ref       TEXT,               -- external ID / record reference from originating system
  ghl_contact_id   TEXT,
  invite_sent_at   TIMESTAMPTZ,
  invite_method    TEXT,               -- 'sms' | 'email' | 'both' | 'none'
  application_id   UUID        REFERENCES contractor_applications(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'invited'
                               CHECK (status IN ('invited', 'applied', 'declined', 'unresponsive')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contractor_recruits_status_idx       ON contractor_recruits(status);
CREATE INDEX IF NOT EXISTS contractor_recruits_state_idx        ON contractor_recruits(service_state);
CREATE INDEX IF NOT EXISTS contractor_recruits_trade_idx        ON contractor_recruits(trade_type);
CREATE INDEX IF NOT EXISTS contractor_recruits_ghl_idx          ON contractor_recruits(ghl_contact_id);
CREATE INDEX IF NOT EXISTS contractor_recruits_created_at_idx   ON contractor_recruits(created_at);

ALTER TABLE contractor_recruits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contractor recruits"
  ON contractor_recruits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage contractor recruits"
  ON contractor_recruits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_contractor_recruits_updated_at
  BEFORE UPDATE ON contractor_recruits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
