-- ─────────────────────────────────────────────────────────────────────────────
-- Jobbidder Affiliate + Tax Audit System
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Referral codes — one per company/user
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

-- 2. Referred companies — companies that signed up via a referral code
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

-- 3. Full transaction ledger — every financial event
CREATE TABLE IF NOT EXISTS affiliate_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code    TEXT        NOT NULL REFERENCES referral_codes(code),
  referral_id      UUID        REFERENCES referrals(id),
  transaction_type TEXT        NOT NULL
                               CHECK (transaction_type IN (
                                 'commission_earned',
                                 'credit_applied',
                                 'payout_issued',
                                 'adjustment',
                                 'pack_purchase',
                                 'overage_charge'
                               )),
  amount_cents     BIGINT      NOT NULL,
  description      TEXT,
  billing_period   TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processed', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Accountant / tax attorney read-only access tokens
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_access_links ENABLE ROW LEVEL SECURITY;

-- referral_codes: owner only
CREATE POLICY referral_codes_owner ON referral_codes
  FOR ALL USING (auth.uid() = user_id);

-- referrals: visible to the referrer
CREATE POLICY referrals_owner ON referrals
  FOR ALL USING (
    referrer_code IN (
      SELECT code FROM referral_codes WHERE user_id = auth.uid()
    )
  );

-- affiliate_transactions: visible to the referrer
CREATE POLICY affiliate_tx_owner ON affiliate_transactions
  FOR ALL USING (
    referrer_code IN (
      SELECT code FROM referral_codes WHERE user_id = auth.uid()
    )
  );

-- audit_access_links: owner only
CREATE POLICY audit_links_owner ON audit_access_links
  FOR ALL USING (auth.uid() = user_id);
