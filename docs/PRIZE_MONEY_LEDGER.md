# Prize Money Ledger (Hackathon Checklist)

This is a pragmatic checklist to ensure we actually demonstrate the sponsor integrations and prize-relevant work during judging.

## What We Show (In-App)

- Mosaic UI (deterministic):
  - `/app/mosaic?source=demo` (always works)
  - Drill-down: Category -> Merchant -> Transactions drawer
- Recurring detection + user choices:
  - `/app/recurring` and the Recurring panel on `/app/mosaic`
- Plan + explainability:
  - `/app/plan` (ranked actions + "Why this?")
- Export artifact (poster):
  - `/app/export` (SVG/PNG)
- Ops analysts + memo:
  - `/app/ops` (deterministic briefs + optional AI rewrite memo)
- Coach (tool calling + handoffs):
  - `/app/coach` (Dedalus optional; offline deterministic fallback)
- Capital One Nessie (sponsor connector):
  - `/app` -> "Capital One Nessie" connect
  - `/app/mosaic?source=nessie` (uses Nessie purchases when configured; falls back safely)
- MCP (tool calling transport):
  - Hosted MCP server `/health` + `/mcp` (see repo root `index.js`)
  - (Optional) `DEDALUS_MCP_SERVER_URL` enables tool calling through MCP
- 15KB Minesweeper side quest (AppLovin proof):
  - `/game` (single file size gate in CI)

## Required / Optional Env

- Always-works demo:
  - no keys required
- Nessie (Capital One):
  - `NESSIE_API_KEY` (server-only)
  - optional: `NESSIE_ACCOUNT_ID` / `NESSIE_CUSTOMER_ID`
  - optional: `NESSIE_BASE_URL` (default: `http://api.nessieisreal.com`)
- Dedalus Coach (optional):
  - `DEDALUS_API_KEY`
  - optional: `DEDALUS_MCP_SERVER_URL`
- AI rewrite (optional):
  - `OPENAI_API_KEY`

## Demo Script (90 seconds)

1. `/health` -> show demo dataset OK + optional integrations present/missing.
2. `/app` -> pick **Demo Data** -> Mosaic.
3. Drill into a tile, show merchant transactions drawer.
4. Show Recurring + mark a subscription Keep/Cancel (choice persists).
5. Show Plan top action + "Why this?".
6. `/app/export` -> export poster.
7. `/app/ops` -> generate Ops memo (AI optional).
8. (Optional) `/app` -> connect Nessie -> Mosaic source=nessie.
9. `/game` -> show under-15KB proof + dashboard button.
