-- Fix cross-account data leak: proposals were world-readable by the anon
-- (public browser) key via a `qual: true` SELECT policy, exposing every
-- contractor's client names, contacts, and revenue to any authenticated or
-- anonymous caller. The dashboard's own-proposals query was resolving through
-- this anon policy, which is why every account saw all proposals.
--
-- Public proposal pages (share link, accept, decline, deposit, email) read
-- proposals server-side via the service role, which bypasses RLS, so no anon
-- SELECT policy is required. The authenticated `proposals_select_own` policy
-- (scoped to the contractor's own rows) remains in place.

drop policy if exists "proposals_select_anon" on public.proposals;
