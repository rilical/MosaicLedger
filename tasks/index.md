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
| AUTH-002 | DOING  | Supabase env template + client/server helpers scaffolded.             |
| AUTH-003 | DOING  | Magic-link login implemented (enabled only when Supabase env exists). |
| AUTH-004 | DOING  | `/app/*` protection via middleware when demo/judge are off.           |
| AUTH-005 | DOING  | Starter schema + RLS policies in `supabase/schema.sql`.               |
