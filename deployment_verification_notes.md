# Deployment Verification Notes

The `impact-proposals-sia` Vercel project is now showing the latest commit message, **Fix Vercel server deployment output**, from branch `main` in the Vercel dashboard. The live production URL `https://impact-proposals-sia.vercel.app/` loads successfully and serves the Bidpilot landing page titled **Bidpilot — AI Proposals That Close**.

The deployment fix committed to GitHub was commit `bd6f102857e45efa8b54f4f826fbbca46b10ed16`. The Vite/TanStack configuration was changed to force the Nitro `vercel` preset and standard Vercel Build Output API paths, producing `.vercel/output/config.json` and `.vercel/output/functions/__server.func/.vc-config.json` during local build verification.

## Live E2E attempt and current findings

The first live E2E attempt against `https://impact-proposals-sia.vercel.app/` passed the home page load with HTTP 200, confirming the frontend is online.

A direct POST to `https://impact-proposals-sia.vercel.app/api/public/test-proposal-flow` returned HTTP 404 with no JSON body. This indicates the public API route is not currently reachable on the live alias, even though the deployment itself is marked `Ready` in Vercel.

The Vercel dashboard shows the latest production deployment for commit `bd6f102` as `Ready`, with deployment URL `https://impact-proposals-lmcwo3cm3-don-anthony-s-projects.vercel.app`.

The deployed frontend bundle contains the Supabase URL value `https://uxejkjtuipdtzeleodzz.supabase.co/rest/v1/`, which is suspicious because Supabase client libraries normally expect the project base URL, for example `https://uxejkjtuipdtzeleodzz.supabase.co`, not the REST endpoint path. A public REST check against `https://uxejkjtuipdtzeleodzz.supabase.co/rest/v1/contractors` returned `PGRST205`, reporting that the `public.contractors` table could not be found in the schema cache.


## Environment Variable Corrections and Redeploy

I corrected both `VITE_SUPABASE_URL` and `SUPABASE_URL` in the Vercel `impact-proposals-sia` project so they use the Supabase project base URL format (`https://<project-ref>.supabase.co`) rather than a REST endpoint URL. Vercel confirmed both variable updates and then created a new Production redeployment from the current `main` deployment, assigned to `impact-proposals-sia.vercel.app`.

Vercel displayed the new deployment path as `/don-anthony-s-projects/impact-proposals-sia/ER2WtqWVqUWTf2Bjg4cywCTDsgud`. Next step is to monitor that deployment until it reaches Ready, then rerun the live end-to-end proposal/intake test.


During deployment monitoring, Vercel showed the new redeploy `ER2WtqWVq` as **Building** on commit `bd6f102` with Production environment selected. The deployment was assigned temporary domains including `impact-proposals-sia-git-main-don-anthony-s-projects.vercel.app` and `impact-proposals-h87v1pxux-don-anthony-s-projects.vercel.app`. The custom production alias will need to be checked after the build reaches Ready.


The redeploy `ER2WtqWVq` has now reached **Ready** in Vercel. It is the **Latest** Production deployment for `impact-proposals-sia`, sourced from `main` commit `bd6f102`, and the production domain `https://impact-proposals-sia.vercel.app` is assigned to this Ready deployment. I am proceeding to rerun the live end-to-end test against the production alias.


## Live E2E diagnosis update

The refreshed production deployment is live and the corrected Supabase project URL is in use. The live E2E test now passes the homepage load and can discover contractors from the corrected Supabase project when using the matching publishable key. The public proposal-flow API still returns `404 Contractor not found` for a known contractor from that project, so the remaining likely production issue is a mismatched `SUPABASE_SERVICE_ROLE_KEY` in Vercel. The next step is to rotate that server-side key to the matching key for `ijgnnhbwujglvkssiloa.supabase.co`, redeploy, and rerun the E2E test.

A menu interaction attempt on `SUPABASE_SERVICE_ROLE_KEY` did not open the edit form, and the page remained on the environment-variable list. No unrelated variable value was saved or changed in that attempt.

The open `SUPABASE_SERVICE_ROLE_KEY` menu's `Edit` action was activated via a controlled page interaction after normal menu clicks did not persist. I am checking whether the edit form opened before entering any new value.


## Fresh redeploy after service-role update

After the reported `SUPABASE_SERVICE_ROLE_KEY` update, I triggered another Production redeploy. The new Vercel deployment `7trNGuGi6` reached **Ready** status, is sourced from branch `main` at commit `bd6f102` (`Fix Vercel server deployment output`), and has `https://impact-proposals-sia.vercel.app` assigned as the production domain.

Next step: rerun the live end-to-end proposal-flow test against the ready production deployment.


## Latest live E2E and Vercel log diagnosis

After the user updated `SUPABASE_SERVICE_ROLE_KEY`, Vercel shows it was updated recently for Production and Preview, and a fresh production redeploy reached Ready. The deployed frontend bundle now exposes the corrected non-secret Supabase project URL: `https://ijgnnhbwujglvkssiloa.supabase.co`.

The live end-to-end script still fails at `/api/public/test-proposal-flow` with HTTP 404 and response `{ "error": "Contractor not found" }`. The script discovers two public contractors from the corrected Supabase project and uses contractor `2c89ceb6-5126-4227-9f91-a7e93d708c66` (`Sudden Impact Agency`, `Flooring`). Vercel runtime logs for the failed POST confirm the production server route executed and made an external GET to `ijgnnhbwujglvkssiloa.supabase.co/rest/v1/contractors`, so the live runtime is now reaching the correct Supabase project URL. The route currently collapses both Supabase query errors and missing contractor data into the same 404 response, so the next step is to expose or log safe non-secret diagnostics for the contractor lookup error/status, then redeploy and retest.
