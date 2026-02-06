# MosaicLedger

Enter with fragments. Leave with something whole.

MosaicLedger is a visual-first budget planner that turns transactions into an explorable mosaic, then produces a ranked next-actions plan.

## Quickstart

- `corepack enable`
- `pnpm install`
- `pnpm dev`

## 60-90s demo script

1. Upload a CSV (or click "Load sample") to assemble the mosaic.
2. Click a category tile to drill down (category -> merchants -> transactions).
3. Open Recurring to see detected subscriptions and predicted next charges.
4. Set a savings goal and view the top 5 actions with quantified monthly impact.
5. (Optional) Trigger a round-up transfer (simulated by default, XRPL testnet later).
6. Export the mosaic as SVG/PNG.

## Repo layout

- `apps/web`: Next.js UI
- `packages/core`: parsing, normalization, categorization, recurring detection, recommendations
- `packages/mosaic`: treemap layout + export helpers
- `packages/banking`: bank API adapters (Plaid-first scaffold)
- `packages/xrpl`: XRPL round-up helpers (scaffold)
- `packages/mcp-server`: MCP tool server (scaffold)
- `data/sample`: demo-safe sample CSV
- `docs`: deeper specs and runbooks
