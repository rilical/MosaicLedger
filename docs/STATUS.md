# Status (Living Doc)

This file is updated in every PR.

## Current Demo Path (must work)

1. `pnpm install`
2. `pnpm dev`
3. Open `http://localhost:3000/app`
4. Click `Use Demo Data`
5. Verify:
   - Mosaic renders with visible tiles
   - Recurring panel shows at least 1 detected item (demo dataset)
   - Plan panel shows ranked actions (demo dataset)

## Latest Changes

- AUTH scaffold (branch: `codex/auth-scaffold`): Supabase magic-link login is wired when env vars are
  present, `/app/*` routes are protected via middleware when demo/judge modes are off, and a starter
  RLS schema is added under `supabase/schema.sql`. Demo Mode remains the default and must continue
  to work with zero keys.

## Known Risks / TODO

- Bank sync is scaffolded; demo mode is the always-works path.
