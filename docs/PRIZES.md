# Prizes

## Capital One DevExchange / Nessie (Best Financial Hack)

**What we built**

- A third data source option on `/app`: **Connect Capital One Nessie** (mock bank).
- Server-only connector:
  - `POST /api/nessie/bootstrap` creates (or reuses) a Nessie customer bound to the logged-in Supabase user.
  - `POST /api/nessie/sync` pulls accounts + purchases, maps them deterministically into `NormalizedTransaction[]`, and upserts into `transactions_normalized`.
- Deterministic engine remains the source of truth; Nessie is only a data source.
- Demo safety: if Nessie is disabled or fails, the UI falls back to Demo Data (never blocks judging).
- Sponsor-style UX surfaces (judge-safe):
  - `/app/capital-one` aggregates Nessie endpoints into clear “Places / Bills / Payments” panels.
  - `GET /api/nessie/overview` fetches purchases + bills + nearby ATMs + branches (with demo fallback).
  - `/app/ops` can include a small “Capital One signals” line in the decision brief when bills are available.

**30-second demo**

1. Go to `/app` and click **Connect Capital One Nessie**.
2. Wait for **Syncing…**, then land on the Mosaic.
3. Re-run analysis: it uses cached normalized transactions (no sponsor network calls required for reruns).
4. Open `/app/capital-one` to show ATMs, branches, bills (future bills), and payments in one screen.
