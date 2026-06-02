-- Contractor-owned delivery integrations.
-- Keep credentials outside public.contractors because contractors has an anon
-- public-read policy for proposal/intake branding. This table must remain
-- authenticated/service-role only so GHL tokens are never exposed publicly.

CREATE TABLE IF NOT EXISTS public.contractor_integrations (
  contractor_id uuid PRIMARY KEY REFERENCES public.contractors(id) ON DELETE CASCADE,
  ghl_api_token text,
  ghl_location_id text,
  ghl_from_number text,
  ghl_from_email text,
  contractor_sms_notifications_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_integrations TO authenticated;
GRANT ALL ON public.contractor_integrations TO service_role;
ALTER TABLE public.contractor_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractor_integrations_select_own" ON public.contractor_integrations;
CREATE POLICY "contractor_integrations_select_own"
  ON public.contractor_integrations
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contractor_integrations_insert_own" ON public.contractor_integrations;
CREATE POLICY "contractor_integrations_insert_own"
  ON public.contractor_integrations
  FOR INSERT TO authenticated
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contractor_integrations_update_own" ON public.contractor_integrations;
CREATE POLICY "contractor_integrations_update_own"
  ON public.contractor_integrations
  FOR UPDATE TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contractor_integrations_delete_own" ON public.contractor_integrations;
CREATE POLICY "contractor_integrations_delete_own"
  ON public.contractor_integrations
  FOR DELETE TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_contractor_integrations_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_contractor_integrations_updated_at ON public.contractor_integrations;
CREATE TRIGGER set_contractor_integrations_updated_at
  BEFORE UPDATE ON public.contractor_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_contractor_integrations_updated_at();
