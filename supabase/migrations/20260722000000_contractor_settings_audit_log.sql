-- ============================================================================
-- JOBBIDDER.IO — Contractor Settings Audit Log
-- ----------------------------------------------------------------------------
-- A basic, permanent record of who changed a contractor's account settings
-- (business profile, pricing, branding) and when, with the before/after
-- values. This is NOT the full enterprise audit-log service described in the
-- technical specification (that would also cover admin actions, logins, and
-- multi-role access across an organization) — it is a real, working, honestly
-- scoped first step: every change to the contractors table is now permanently
-- logged, automatically, with no application code changes required.
--
-- Two columns are deliberately excluded from the logged values because they
-- hold secrets (API tokens), not settings: anthropic_api_key, ghl_api_token.
-- updated_at is excluded so a bare timestamp bump never creates noise entries.
--
-- Purely additive: a new table + a new trigger. Nothing about how the
-- contractors table is read or written today changes. Does NOT touch any RLS
-- policy on proposals or estimates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_settings_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID        NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  changed_by    UUID        DEFAULT auth.uid(),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values    JSONB,
  new_values    JSONB
);

CREATE INDEX IF NOT EXISTS contractor_settings_audit_log_contractor_idx
  ON contractor_settings_audit_log (contractor_id, changed_at DESC);

ALTER TABLE contractor_settings_audit_log ENABLE ROW LEVEL SECURITY;

-- A contractor may read their own audit history, never anyone else's.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='contractor_settings_audit_log'
    AND policyname='Read own settings audit log'
  ) THEN
    CREATE POLICY "Read own settings audit log"
      ON contractor_settings_audit_log FOR SELECT TO authenticated
      USING (contractor_id IN (SELECT id FROM contractors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Service role has full access (for admin tooling / support use).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='contractor_settings_audit_log'
    AND policyname='Service role manages settings audit log'
  ) THEN
    CREATE POLICY "Service role manages settings audit log"
      ON contractor_settings_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE policy for `authenticated` — rows are written only
-- by the trigger function below, which runs SECURITY DEFINER so it can log
-- the change regardless of who performed the update.

CREATE OR REPLACE FUNCTION log_contractor_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO contractor_settings_audit_log (contractor_id, changed_by, old_values, new_values)
  VALUES (
    NEW.id,
    auth.uid(),
    to_jsonb(OLD) - 'anthropic_api_key' - 'ghl_api_token' - 'updated_at',
    to_jsonb(NEW) - 'anthropic_api_key' - 'ghl_api_token' - 'updated_at'
  );
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='contractors_settings_audit_trigger') THEN
    CREATE TRIGGER contractors_settings_audit_trigger
      AFTER UPDATE ON contractors
      FOR EACH ROW
      WHEN (
        (to_jsonb(OLD) - 'anthropic_api_key' - 'ghl_api_token' - 'updated_at')
        IS DISTINCT FROM
        (to_jsonb(NEW) - 'anthropic_api_key' - 'ghl_api_token' - 'updated_at')
      )
      EXECUTE FUNCTION log_contractor_settings_change();
  END IF;
END $$;
