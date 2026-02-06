# MosaicLedger

Enter with fragments. Leave with something whole.

MosaicLedger is a visual-first budget planner that turns transactions into an explorable mosaic, then produces a ranked next-actions plan.

## Quickstart

- `corepack enable`
- `pnpm install`
- `pnpm dev`

## 60-90s demo script

1. Open `http://localhost:3000/app`.
2. Click `Use Demo Data` (always works, no keys).
3. Hover the Mosaic mural to see tile-level spend detail.
4. Open Recurring to see detected subscriptions and predicted next charges.
5. View the top ranked actions with quantified monthly impact.
6. (Optional) Toggle Judge Mode / Demo Mode in Settings to harden the live demo.

## Dev utilities

- `pnpm check-demo`: CI-grade verification that demo data generates tiles + recurring.
- `pnpm seed`: generate `data/seed/demoDerived.json` (ignored) for quick local inspection.

## Repo layout

- `apps/web`: Next.js UI
- `tasks/index.md`: single task board for parallel work
- `packages/core`: parsing, normalization, categorization, recurring detection, recommendations
- `packages/mosaic`: treemap layout + export helpers
- `packages/banking`: bank API adapters (Plaid-first scaffold)
- `packages/xrpl`: XRPL round-up helpers (scaffold)
- `packages/mcp-server`: MCP tool server (scaffold)
- `data/sample`: demo-safe sample CSV
- `docs`: deeper specs and runbooks
