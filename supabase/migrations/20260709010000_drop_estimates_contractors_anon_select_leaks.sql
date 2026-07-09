-- Close the remaining cross-account read leaks (companion to the proposals fix).
--
-- The `contractors` table has `anthropic_api_key` and `billing_email` columns,
-- and a `qual: true` SELECT policy meant the anon (public browser) key — and
-- any authenticated user, via a second over-broad policy — could read every
-- contractor's API key and billing info. `estimates` and `proposal_acceptances`
-- were similarly world-readable.
--
-- Public estimate pages now read the estimate + branding-safe contractor fields
-- server-side via the service role (/api/public/estimate), so no public SELECT
-- policy is required. Authenticated "select_own" policies remain for the
-- dashboard and settings pages.

drop policy if exists "contractors_public_select" on public.contractors;
drop policy if exists "contractors_public_select_authenticated" on public.contractors;
drop policy if exists "estimates_select_anon" on public.estimates;
drop policy if exists "acceptances_public_select" on public.proposal_acceptances;
