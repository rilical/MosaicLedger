# Prize Evidence Pack

This file is the single place to collect screenshot-able proof points for sponsor tracks.
Keep it honest: only claim what the app can do in the current branch/commit.

## Capital One (Nessie)

**What we built**

- A server-only Capital One Nessie connector that pulls purchases and runs the same deterministic engine + Mosaic UI.
- Base URL is configurable so we are not pinned to a single hostname.
- Demo safety: if Nessie is down / key missing / key is GET-only, the app falls back to deterministic Demo Data.

**Env vars**

- `NESSIE_API_KEY` (required for live Nessie)
- `NESSIE_BASE_URL` (optional, defaults to `https://api.nessieisreal.com`; also supports `https://api.reimaginebanking.com`)
- `NESSIE_CUSTOMER_ID` (optional; recommended for GET-only keys)
- `NESSIE_ACCOUNT_ID` (optional; recommended for GET-only keys)

**Endpoints used**

- `GET /customers`
- `GET /customers/{id}/accounts`
- `GET /accounts/{id}/purchases`
- (optional bootstrap flow) `POST /customers` and `POST /customers/{id}/accounts`

**App proof**

- Connect screen shows a button: `Use Capital One Nessie`.
- Mosaic/Plan header shows: `Source: Nessie (Capital One)` after a successful run.
- Health page shows Nessie config presence (never prints the key).

**Fallback behavior**

- If Nessie bootstrap/sync errors (timeout/502/403/missing key), the UI forces Demo/Judge mode and continues with demo artifacts.

**Screenshot checklist**

- Connect page with `Use Capital One Nessie` visible.
- Mosaic page with `Source: Nessie (Capital One)` badge visible.
- Optional: `/health` showing `Capital One Nessie (optional)` status line.

## Dedalus (MosaicCoach)

Pending in this file until `DED-PRIZE-001` is implemented (coach run + tool trace + multi-model handoff evidence).
