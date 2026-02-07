# MCP server

Goal: expose the budget brain as tools.

Run (dev)

- `pnpm mcp:dev`

Endpoints

- `GET /health` -> `{ ok, name, version }`
- `POST /mcp` -> Streamable HTTP MCP transport (stateless)

Tools (v1)

- `analyzeTransactions`
- `buildMosaicSpec`
- `buildActionPlan`

Schemas

- `packages/mcp-server/src/schemas.ts` (zod; `version: "v1"`)
