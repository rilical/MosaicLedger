# Dependency Policy (Hackathon)

This repo aims to be demo-safe and predictable under time pressure. That means: prefer pinned
versions and lockfile discipline during the event, and do upgrades in controlled batches after.

## Lockfile Discipline

- Use `pnpm` only.
- Do not delete `pnpm-lock.yaml`.
- CI installs with `pnpm install --frozen-lockfile`.

## During Hackathon

- Avoid dependency upgrades unless required to unblock shipping.
- If you must add/upgrade deps:
  - Keep the change in a single PR.
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
  - Mention the upgrade in `docs/STATUS.md`.

## After Hackathon

- Batch upgrades weekly (or bi-weekly) instead of ad-hoc.
- If any security scan flags a critical vulnerability:
  - Prefer a narrow upgrade.
  - Rotate any impacted keys if there is any chance of exposure.
