-- ============================================================================
-- JOBBIDDER — Missing Tables Migration
-- Run this in Supabase Dashboard → SQL Editor
-- These tables are required for credit tracking, affiliate program, and
-- the contractor recruitment pipeline.
-- ============================================================================

-- ── Credit Tracking ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_ledger (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  action_type    TEXT        NOT NULL CHECK (action_type IN (
                               'proposal', 'voice_prequal', 'document_extraction',
                               'sms_sequence', 'verification_report', 'renewal_alert'
                             )),
  credits_used   INT         NOT NULL DEFAULT 1,
  is_overage     BOOLEAN     NOT NULL DEFAULT FALSE,
  billing_period TEXT        NOT NULL,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_pack_purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id     UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pack_name         TEXT        NOT NULL CHECK (pack_name IN ('starter', 'growth', 'scale')),
  credits_total     INT         NOT NULL,
  credits_remaining INT         NOT NULL,
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_ledger_contractor_period
  ON credit_ledger (contractor_id, billing_period);

CREATE INDEX IF NOT EXISTS credit_pack_active
  ON credit_pack_purchases (contractor_id)
  WHERE credits_remaining > 0;

ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_pack_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_ledger' AND policyname='credit_ledger_owner') THEN
    CREATE POLICY credit_ledger_owner ON credit_ledger
      FOR SELECT USING (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_pack_purchases' AND policyname='credit_pack_owner') THEN
    CREATE POLICY credit_pack_owner ON credit_pack_purchases
      FOR SELECT USING (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ── Affiliate / Referral System ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_codes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name      TEXT        NOT NULL,
  code              TEXT        UNIQUE NOT NULL,
  payout_preference TEXT        NOT NULL DEFAULT 'credit'
                                CHECK (payout_preference IN ('credit', 'payout')),
  payout_email      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code     TEXT        NOT NULL REFERENCES referral_codes(code),
  referred_company  TEXT        NOT NULL,
  referred_email    TEXT,
  plan_name         TEXT        NOT NULL DEFAULT 'Journeyman',
  plan_amount_cents BIGINT      NOT NULL DEFAULT 49700,
  commission_rate   NUMERIC     NOT NULL DEFAULT 0.15,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'active', 'churned')),
  activated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code    TEXT        NOT NULL REFERENCES referral_codes(code),
  referral_id      UUID        REFERENCES referrals(id),
  transaction_type TEXT        NOT NULL
                               CHECK (transaction_type IN (
                                 'commission_earned', 'credit_applied', 'payout_issued',
                                 'adjustment', 'pack_purchase', 'overage_charge'
                               )),
  amount_cents     BIGINT      NOT NULL,
  description      TEXT,
  billing_period   TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processed', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_access_links (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token            TEXT        UNIQUE NOT NULL,
  label            TEXT,
  access_level     TEXT        NOT NULL DEFAULT 'read_only',
  expires_at       TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_access_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_codes' AND policyname='referral_codes_owner') THEN
    CREATE POLICY referral_codes_owner ON referral_codes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='referrals_owner') THEN
    CREATE POLICY referrals_owner ON referrals FOR ALL USING (
      referrer_code IN (SELECT code FROM referral_codes WHERE user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='affiliate_transactions' AND policyname='affiliate_tx_owner') THEN
    CREATE POLICY affiliate_tx_owner ON affiliate_transactions FOR ALL USING (
      referrer_code IN (SELECT code FROM referral_codes WHERE user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_access_links' AND policyname='audit_links_owner') THEN
    CREATE POLICY audit_links_owner ON audit_access_links FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

SELECT 'All missing tables created successfully' AS status;
