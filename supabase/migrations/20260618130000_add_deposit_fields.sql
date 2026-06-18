ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deposit_invoice_id text,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'none' CHECK (deposit_status IN ('none','pending','paid','failed'));
