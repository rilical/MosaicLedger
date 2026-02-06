# Contributing

## Workflow (CodeRabbit-friendly)

- One feature per PR.
- Keep PRs small: 30-150 lines when possible.
- Prefer pure functions in `packages/*` with unit tests.

## Branching

- Branch name: `codex/<short-topic>`.

## Local checks

- Install: `corepack enable && pnpm install`
- Dev: `pnpm dev`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`
- Format: `pnpm format`

## Demo stability rules

- The demo must work without external keys by using the sample dataset.
- Do not log raw CSV rows or sensitive values.
