# Status (Living Doc)

This file is updated in every PR.

## Current Demo Path (must work)

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:3000/app`
4. Click `Use Demo Data`
5. Verify:
   - Mosaic renders with visible tiles
   - Recurring panel shows at least 1 detected item (demo dataset)
   - Plan panel shows ranked actions (demo dataset)

## Latest Changes

- DED-002/003/004/005/006 (branch: `codex/ded-002-mcp-streamable-http`): implemented a stateless
  Streamable HTTP MCP server in `packages/mcp-server` with `/health` + `/mcp` endpoints, strict zod
  validation (`v1`), and 3 deterministic tools: `analyzeTransactions`, `buildMosaicSpec`,
  `buildActionPlan`.
- UX-002 (branch: `codex/ux-002-loading-skeleton`): added Mosaic loading skeleton + a simple
  progress line; when analysis is slow, offers a one-click switch to demo data.
- QA-018 (branch: `codex/qa-018-pr-gates`): tightened PR template requirements and added label
  automation (`needs-review` on open; `safe-to-merge` on CI success).
- QA-021 (branch: `codex/qa-021-release-reset`): added expo release checklist and an optional
  "Expo reset" button (guarded by env flags) to clear local demo state and best-effort clear cached
  analysis server-side.
- QA-019 (branch: `codex/qa-019-dep-audit`): added a non-blocking dependency audit job to CI and
  documented lockfile/upgrade policy.
- QA-017/QA-022 (branch: `codex/qa-017-022-health-schema-integrations`): expanded `/health` with
  schema checks (table/column presence) and integration statuses (Supabase/Plaid/XRPL/Dedalus/AI),
  including a best-effort Plaid "last sync" timestamp.
- QA-016 (branch: `codex/qa-016-fuzz-tests`): adds fuzz/edge-case tests for transaction
  normalization + filters + summaries to ensure totals stay finite and consistent under weird
  inputs.
- Restore analysis-driven pages (Mosaic/Recurring/Plan) after landing-page merge regression:
  re-enabled shared AnalysisControls (range + filters), brought back Plan explainability + scenario
  compare, fixed `/login` duplicate "Login" headings (Playwright strict locator), and normalized
  formatting to keep CI green.
- AUTH scaffold (branch: `codex/auth-scaffold`): Supabase magic-link login is wired when env vars are
  present, `/app/*` routes are protected via middleware when demo/judge modes are off, and a starter
  RLS schema is added under `supabase/schema.sql`. Demo Mode remains the default and must continue
  to work with zero keys.
- AUTH-006 (branch: `codex/auth-006-artifacts`): added `analysis_runs` table (JSON artifacts),
  `/api/engine/analyze` (GET latest, POST recompute/store), and optional cached rendering for
  `/app/mosaic` when Supabase is configured and demo/judge are disabled.
- BANK-002/003 (branch: `codex/bank-002-003-plaid-server`): adds server-only Plaid client scaffold
  plus `/api/plaid/health` and `/api/plaid/link-token` with judge/demo fallback tokens.
- DATA-004/005 (branch: `codex/data-004-005-range-filters`): adds range selection (This month / Last
  month / Custom) and deterministic transaction exclusions (refunds + transfer-like) that apply to
  Mosaic, Recurring, and Plan. Settings persist in `localStorage`, and `/api/engine/analyze` is
  triggered on changes. Demo check now pre-builds shared packages before running.
- PLAN-007/008/009 (branch: `codex/plan-007-009-explain-budget-scenario`): expands the Plan page
  with deterministic explainability ("Why this?"), a Visa-style budget table with accept-as-goal
  cap flow, and a before/after scenario card with action toggles. Optional AI rewrite is exposed via
  `/api/ai/rewrite` and never changes numbers (token-guarded; falls back when no key).
- EXPORT-001/002/003 (branch: `codex/export-001-003-poster-export`): implements poster export as a
  single artifact: Mosaic + legend + top actions, downloadable as SVG/PNG from `/app/export`.
  Privacy mode redacts merchant names in the plan summary.
- DEPLOY-003 (branch: `codex/deploy-003-health`): adds a `/health` page for judges and the team to
  quickly verify demo dataset availability and the presence of optional integration env vars. No
  secrets are displayed.
- QA-001 (branch: `codex/qa-001-playwright-harness`): adds Playwright e2e harness + CI job and a
  smoke test that loads `/health` and `/login`.
- QA-012 (branch: `codex/qa-012-gitleaks`): adds gitleaks secret scanning to CI and documents key
  rotation steps.

## Known Risks / TODO

- Bank sync is scaffolded; demo mode is the always-works path.
