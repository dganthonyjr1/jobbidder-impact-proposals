ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
COMMENT ON COLUMN public.proposals.language IS 'BCP-47-ish short code: en, es, fr, pt, ht. Drives proposal generation language and downstream SMS/email locale.';
COMMENT ON COLUMN public.estimates.language IS 'Short language code: en, es, fr, pt, ht.';