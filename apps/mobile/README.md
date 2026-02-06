# MosaicLedger Mobile (UI-only)

This is a one-shot iOS/Android UI prototype built with Expo.

## Run

- From repo root: `pnpm -C apps/mobile install`
- Start: `pnpm -C apps/mobile start`
- iOS: `pnpm -C apps/mobile ios`
- Android: `pnpm -C apps/mobile android`

## What is implemented

- Onboarding: choose sample/bank/csv (bank/csv are UI-only placeholders)
- Mosaic mural screen: tap tiles, export/search affordances (stubbed)
- Recurring screen: upcoming charges list + override controls (stubbed)
- Actions screen: goal card + top 5 ranked actions (UI-only)
- Settings: data sources + exports (UI-only)

## Product notes

- This build intentionally ships with mocked data so the demo never depends on external APIs.
- Next steps (business-grade): connect to bank APIs via `packages/banking` (Plaid/open banking), run analysis via `packages/core`, and cache/sync with a real store.
