# Prize Coverage Matrix (Truthful Demo)

This matrix is a _truth constraint_ tool: for each sponsor prize, it lists what we can demo **today**
vs what is **planned**, and the exact UI/routes we’ll use as proof.

Demo safety rule: if a dependency can fail live (bank API, XRPL, hosted tools, AI), it must be
behind a feature flag and must not block the core demo path (`Use Demo Data`).

## Legend

- Status: `NOW` (works on `main` with demo data) | `PLANNED` (scaffolded or not started)
- Proof: concrete path to show judges (page/route + what to click)

## Matrix

| Sponsor prize                           | Requirement (truthful)                                                            | Proof in demo                                                                                                                                                                                       | Status                                                     | Key dependencies                                            | Primary work remaining                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Visa: Intelligent Budget Planner**    | Budget caps + day-to-day insights + actionable guidance + subscriptions/recurring | `/app` → `Use Demo Data` → `Plan` (Budget table + caps + scenario compare + explainability). `/app/recurring` (recurring list). `/app/mosaic` (mural). `/app/export` (poster export).               | `NOW`                                                      | None (demo mode).                                           | Polish REC UI + add category overrides (`DATA-006`) for “intelligent” edits.                          |
| **Capital One: Best financial hack**    | Real bank sync + explainable plan + projections/what-if                           | `/app/plan` shows explainable, deterministic plan + before/after scenario. Bank sync: show `/api/plaid/health` + `/api/plaid/link-token` working in sandbox (then connect flow once BANKP is done). | Explainable plan: `NOW`. Real bank sync: `PLANNED`.        | Plaid keys + Supabase schema/env for token storage.         | Implement `/api/plaid/exchange`, `/api/plaid/sync`, store normalized txns (`BANK-*`, `DATA-001/002`). |
| **Conway: Best AI decision support**    | AI-guided decisions via tool calling; deterministic math underneath               | Today: Plan explainability is deterministic. Optional: toggle AI rewrite in “Why this?” (text-only) when enabled. Tool-calling: will be via MCP tools.                                              | AI rewrite: `NOW` (optional). Tool calling: `PLANNED`.     | `OPENAI_API_KEY` (for rewrite), MCP wiring for tool calls.  | Add real tool-calling demo (MCP tools + agent orchestration), keep math deterministic.                |
| **Dedalus: Best use of model handoffs** | Multiple models for routing/summarizing/narrative inside one agent                | Can demo deterministic artifacts now; handoffs are planned via Dedalus agent + tool routing.                                                                                                        | `PLANNED`                                                  | Dedalus account/API key + MCP hosting decisions.            | Implement Dedalus agent router + “handoff trace” UI/logging.                                          |
| **Dedalus: Best use of tool calling**   | MCP tools + local tools + trace UI                                                | MCP server package exists; not yet wired into app/judge story.                                                                                                                                      | `PLANNED`                                                  | MCP server + (optional) hosted endpoint.                    | Implement 3 tools: `analyzeTransactions`, `buildMosaicSpec`, `buildActionPlan` + a trace panel.       |
| **CodeRabbit: Best use**                | PR hygiene + review automation + quality gates                                    | Show `.coderabbit.yaml`, PR template, CI checks, and CodeRabbit comments on PRs.                                                                                                                    | `NOW`                                                      | CodeRabbit installed on repo.                               | Add secrets scanning in CI (`QA-012`) + Playwright e2e (`QA-001..`).                                  |
| **Ripple: XRPL MVP**                    | Round-ups + goal pot + receipts (testnet), with simulation fallback               | `/app/xrpl` → Simulate Receipt (deterministic). Shows simulated tx hash + memo.                                                                                                                     | Simulated receipts: `NOW`. Testnet send/escrow: `PLANNED`. | `XRPL_TESTNET_SEED`, `XRPL_RPC_URL` (optional for testnet). | Implement real testnet send + escrow goal pots; keep simulation always available.                     |
| **AppLovin: 15KB mobile browser game**  | Playable, self-contained, <15KB bundle                                            | `/game` (static) → Start → tap 3 times → score changes. Proof-of-size: `pnpm game:size`.                                                                                                            | `NOW`                                                      | None (pure static files).                                   | Add submission checklist + a mobile viewport e2e smoke test.                                          |
| **Roboclub: Best hardware hack**        | Optional physical mosaic display                                                  | Not started.                                                                                                                                                                                        | `PLANNED`                                                  | Hardware availability.                                      | SPI/serial output adapter + “send-to-display” button; keep optional.                                  |
| **BNY: TBD**                            | Rapid adaptation once prompt announced                                            | We can adapt deterministic analysis + export pipeline quickly once prompt drops.                                                                                                                    | `PLANNED`                                                  | Prompt details.                                             | Keep a “prompt adapter” task placeholder and reuse BANK/VISA hooks as needed.                         |

## What We Can Demo Reliably Today (No Keys)

1. `http://localhost:3000/app` → `Use Demo Data`
2. Mosaic mural: `/app/mosaic`
3. Recurring list: `/app/recurring`
4. Plan: `/app/plan` (explainability + budget caps + scenario compare)
5. Export poster: `/app/export` (download SVG/PNG)
6. AppLovin game: `/game` (playable, static, size-gated)

## Keys Checklist (Only Needed When You Want The Live Integrations)

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Plaid (sandbox):
  - `PLAID_CLIENT_ID`
  - `PLAID_SECRET`
  - `PLAID_ENV=sandbox`
- Optional AI rewrite (text-only; demo-safe fallback if absent):
  - `OPENAI_API_KEY`
  - optional `OPENAI_MODEL`
  - optional `OPENAI_BASE_URL`
- Optional Dedalus/MCP:
  - `DEDALUS_API_KEY`
- Optional XRPL:
  - `XRPL_TESTNET_SEED`
  - `XRPL_RPC_URL` (default testnet: `https://s.altnet.rippletest.net:51234/`)
