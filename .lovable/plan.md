
## Estimates vs Proposals — separate products

Right now everything funnels into the `proposals` table and the `/p/:id` page. I'll add Estimates as a fully separate product with its own table, route, generator, and Retell branch.

### 1. Database — new `estimates` table

A new table (not a flag on `proposals`) because the shape is genuinely different — ranges instead of fixed prices, no tiers, no acceptance.

Fields:
- `id`, `estimate_number`, `contractor_id`, `status` (`draft` / `sent` / `viewed` / `upgraded`)
- `client_name`, `client_phone`, `client_email`, `job_address`, `job_state`
- `trade_type`, `scope_summary` (1–2 paragraphs, plain text)
- `material_low`, `material_high` (numeric ranges)
- `labor_low`, `labor_high`
- `total_low`, `total_high`
- `valid_through` (date)
- `source` (`retell` / `manual`), `raw_input` (jsonb)
- `upgraded_to_proposal_id` (uuid, nullable — set when client clicks "Get full proposal")
- timestamps

RLS mirrors `proposals`: public read, contractor-scoped insert/update/delete. Plus `estimate_views` table mirroring `proposal_views` for tracking opens.

### 2. Public route `/e/:id`

Single-page branded estimate. Contractor logo + brand color in header, then:
- Client / job address / date / valid-through
- "Scope at a glance" — the narrative summary
- Three compact rows: Materials range, Labor range, **Total range** (highlighted)
- One CTA button: **"Get the full proposal"** — calls a server fn that promotes the estimate into a full `proposal` row (copying contact/address/trade) and redirects to `/p/:newId`
- Small print: "This is a non-binding ballpark. Final pricing requires site review."
- Jobbidder footer (same as proposal page)

No signature block, no tier cards, no itemized tables.

### 3. Generation

New server fn `generateEstimate()` in `src/lib/estimates.functions.ts`:
- Same Claude call shape as proposal generation, but a much simpler prompt that returns just `{scope_summary, material_low/high, labor_low/high, total_low/high, timeline_text}` for the trade + state.
- Returns in ~5–10s vs ~30s for the full proposal.

### 4. Retell webhook — caller chooses at start of call

Update `src/routes/api/public/webhook.retell.tsx`:
- Read a new field from Retell's `call_analysis` / variables: `document_type` ∈ `"estimate" | "proposal"` (default `"proposal"` if missing, for backward compat).
- The Retell agent script will ask "Would you like a quick ballpark estimate or a full detailed proposal?" at call start and store the answer in that variable. I'll document the exact variable name in the PR so you can paste it into the Retell agent prompt.
- Branch:
  - `estimate` → `generateEstimate()` → insert into `estimates` → SMS link `/e/:id`
  - `proposal` → existing flow (unchanged)

### 5. Dashboard

`/_authenticated/dashboard` gets two tabs (or two stacked sections): **Estimates** and **Proposals**, each with their own list, counts, and "View" links. Estimates show the range; proposals show the accepted/selected tier total.

### 6. SMS copy

- Estimate SMS: "Hi {name}, here's your ballpark estimate from {business}: {link}. Reply to talk through a full proposal."
- Proposal SMS: unchanged.

### Technical notes

- Migration creates `estimates` + `estimate_views` with GRANTs (public read, authenticated CRUD scoped to contractor, service_role full) and RLS.
- "Upgrade to proposal" server fn is public (anon-callable) but only allows upgrading an estimate that exists, and writes the new proposal under the same `contractor_id`.
- Route file: `src/routes/e.$id.tsx` (mirrors `p.$id.tsx`).
- All brand colors / logo pulled from `contractors` row, same as proposal page.

### Out of scope for this PR

- Editing estimates in-dashboard (read-only for now; regenerate via new call).
- Auto-converting accepted proposals back to estimates.
- Custom Retell prompt rewrite — I'll only document the variable name; you control the agent script.

Approve and I'll create the migration first, then the route, generator, webhook branch, and dashboard tabs.
