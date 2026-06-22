CREATE TABLE IF NOT EXISTS jessica_followup_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   TEXT        NOT NULL UNIQUE,
  phone        TEXT,
  name         TEXT,
  location_id  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'called', 'failed', 'cancelled')),
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS jessica_followup_queue_pending_idx
  ON jessica_followup_queue (created_at)
  WHERE status = 'pending';
