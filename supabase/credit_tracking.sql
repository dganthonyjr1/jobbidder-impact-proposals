-- ─────────────────────────────────────────────────────────────────────────────
-- Jobbidder Credit Tracking
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Every AI action that burns a credit gets a row here
CREATE TABLE IF NOT EXISTS credit_ledger (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  action_type    TEXT        NOT NULL CHECK (action_type IN (
                               'proposal',
                               'voice_prequal',
                               'document_extraction',
                               'sms_sequence',
                               'verification_report',
                               'renewal_alert'
                             )),
  credits_used   INT         NOT NULL DEFAULT 1,
  is_overage     BOOLEAN     NOT NULL DEFAULT FALSE,
  billing_period TEXT        NOT NULL,  -- 'YYYY-MM'
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add-on credit pack purchases
CREATE TABLE IF NOT EXISTS credit_pack_purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id     UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pack_name         TEXT        NOT NULL CHECK (pack_name IN ('starter', 'growth', 'scale')),
  credits_total     INT         NOT NULL,
  credits_remaining INT         NOT NULL,
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS credit_ledger_contractor_period
  ON credit_ledger (contractor_id, billing_period);

CREATE INDEX IF NOT EXISTS credit_pack_active
  ON credit_pack_purchases (contractor_id)
  WHERE credits_remaining > 0;

-- RLS
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Service role (used by server functions) bypasses RLS automatically.
-- Authenticated users can read their own records via the dashboard.
CREATE POLICY credit_ledger_owner ON credit_ledger
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY credit_pack_owner ON credit_pack_purchases
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE user_id = auth.uid()
    )
  );
