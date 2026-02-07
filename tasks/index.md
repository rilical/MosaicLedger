# Task Board

Status legend: `TODO` | `DOING` | `BLOCKED` | `REVIEW` | `DONE`

## Setup & Scaffolding (S)

| ID    | Status | Notes                                                          |
| ----- | ------ | -------------------------------------------------------------- |
| S-001 | DONE   | Baseline tooling, PR template, CodeRabbit config, living docs. |
| S-002 | DONE   | Next.js app boots; primary routes are `/login` and `/app`.     |
| S-003 | DONE   | Workspace packages wired; UI imports from shared packages.     |
| S-004 | DONE   | `.coderabbit.yaml` added (install GitHub app separately).      |
| S-005 | DONE   | Feature flags module + Settings drawer (runtime overrides).    |
| S-006 | DONE   | Demo dataset in `packages/banking` + "Use Demo Data" flow.     |
| S-007 | DONE   | CI runs lint, typecheck, tests, demo check, format check.      |
| S-008 | DONE   | Shared UI components (Button/Card/Badge/Drawer/Tooltip).       |
| S-009 | DONE   | `pnpm seed` generates derived demo outputs (local-only).       |

## Next Epics (recommended)

- Bank API sync: implement server-only `/api/plaid/*` routes with strict demo fallback.
- Data persistence: Supabase schema + minimal writes of normalized txns + artifacts.
- Mosaic drill-down: category -> merchant -> transaction drawer without navigation.

## Auth & Database (AUTH)

| ID       | Status | Notes                                                                 |
| -------- | ------ | --------------------------------------------------------------------- |
| AUTH-001 | TODO   | Create Supabase project + enable email auth + set redirect URLs.      |
| AUTH-002 | DONE   | Supabase env template + client/server helpers scaffolded.             |
| AUTH-003 | DONE   | Magic-link login implemented (enabled only when Supabase env exists). |
| AUTH-004 | DONE   | `/app/*` protection via middleware when demo/judge are off.           |
| AUTH-005 | DONE   | Starter schema + RLS policies in `supabase/schema.sql`.               |
| AUTH-006 | DONE   | `analysis_runs` table + `/api/engine/analyze` + cached latest render. |

## Data (DATA)

| ID       | Status | Notes                                                                 |
| -------- | ------ | --------------------------------------------------------------------- |
| DATA-004 | DONE   | Date range selector (This month / Last month / Custom) + persistence. |
| DATA-005 | DONE   | Transaction exclusions (refunds/transfers) wired into analysis + UI.  |
| DATA-006 | TODO   | Category override pipeline (persist + apply on next analysis run).    |

## Plan (PLAN)

| ID       | Status | Notes                                                                |
| -------- | ------ | -------------------------------------------------------------------- |
| PLAN-007 | REVIEW | Explainability: expandable "Why this?" + optional AI rewrite toggle. |
| PLAN-008 | REVIEW | Budget table per category + accept cap as goal (localStorage).       |
| PLAN-009 | REVIEW | Scenario compare (before/after) + action toggles (deterministic).    |

## Export (EXPORT)

| ID         | Status | Notes                                                       |
| ---------- | ------ | ----------------------------------------------------------- |
| EXPORT-001 | REVIEW | `exportToSvg()` poster generator (mosaic + legend + totals) |
| EXPORT-002 | REVIEW | PNG export (client canvas) + download buttons               |
| EXPORT-003 | REVIEW | Poster includes top 5 plan actions + range + total spend    |
| EXPORT-004 | TODO   | Optional share link (requires storage + /share route)       |
| EXPORT-005 | TODO   | Export QA pass (clipping, sizing, safe area)                |

## Bank Connector (BANK)

| ID       | Status | Notes                                                         |
| -------- | ------ | ------------------------------------------------------------- |
| BANK-001 | TODO   | Create Plaid account + sandbox keys.                          |
| BANK-002 | DONE   | Server-only Plaid client module + `/api/plaid/health`.        |
| BANK-003 | DONE   | `/api/plaid/link-token` (judge/demo mode returns fake token). |

## Deploy (DEPLOY)

| ID         | Status | Notes                                                     |
| ---------- | ------ | --------------------------------------------------------- |
| DEPLOY-003 | REVIEW | `/health` page shows system state (no secrets; demo-safe) |

## QA

| ID     | Status | Notes                                                |
| ------ | ------ | ---------------------------------------------------- |
| QA-001 | REVIEW | Playwright e2e harness + smoke test (/health,/login) |
| QA-012 | DONE   | Gitleaks secret scanning in CI + rotation docs       |
| QA-016 | DONE   | Core engine fuzz tests for weird transactions        |
| QA-017 | DONE   | /health schema checks + clear fix instructions       |
| QA-022 | DONE   | /health integration statuses + Plaid last sync       |
| QA-019 | DONE   | CI dependency audit job (non-blocking)               |
| QA-021 | DONE   | Release checklist + Expo reset button                |
| QA-018 | DONE   | PR template + labels automation + branch protection  |
