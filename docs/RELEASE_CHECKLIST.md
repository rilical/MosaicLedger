# Release Checklist (Expo / Judges)

This is the do-not-think list for demo day. The goal is: no live dependency can block the demo.

## Pre-Expo (30 minutes before)

1. Pull latest main:
   - `git pull`
2. Install deps:
   - `pnpm install`
3. Local smoke:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm test:e2e`
4. Start app:
   - `pnpm dev`
5. Open `/health`:
   - Confirm Demo dataset OK.
   - If using Supabase: confirm schema OK (or apply `supabase/schema.sql`).
   - If using Plaid: confirm Plaid env OK.

## Judge Mode Defaults

Recommended env defaults for the booth:

- `NEXT_PUBLIC_DEMO_MODE=1`
- `NEXT_PUBLIC_JUDGE_MODE=1`

This keeps the core demo deterministic and fail-safe.

## During Expo (If Anything Breaks)

1. Open Settings.
2. Toggle:
   - Judge Mode ON
   - Demo Mode ON
3. Click `Expo reset` (only if enabled):
   - Requires `NEXT_PUBLIC_EXPO_RESET_ENABLED=1` (UI)
   - Optional server-side cache clear: `EXPO_RESET_ENABLED=1`
4. Continue the demo using:
   - `/app` -> `Use Demo Data`

## After Expo (Post-event cleanup)

1. Rotate any keys used on shared machines.
2. Disable expo reset env flags.
3. If Plaid/Supabase were used: confirm no secrets were committed (CI gitleaks should be green).
