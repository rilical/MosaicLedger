# Contracts (Single Source Of Truth)

If you need a new field, add it here first, then implement it in:

1. `packages/core` (engine math stays deterministic)
2. `packages/banking` (connectors map raw -> normalized)
3. `apps/web` (UI consumes outputs; never invents fields)

## Core Types

Exported from:

- `packages/core/src/types.ts`

## MCP Tool Schemas

Exported/validated in:

- `packages/mcp-server/src/schemas.ts` (zod, versioned as `v1`)

## Conventions

- Amounts are spend-positive for MVP (refunds ignored).
- Dates are `YYYY-MM-DD` (ISO-ish).
- Demo mode must never require network access or keys.
