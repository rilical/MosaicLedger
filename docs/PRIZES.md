# Prizes

## Capital One DevExchange / Nessie (Best Financial Hack)

**What we built**

- A third data source option on `/app`: **Connect Capital One Nessie** (mock bank).
- Server-only connector:
  - `POST /api/nessie/bootstrap` creates (or reuses) a Nessie customer bound to the logged-in Supabase user.
  - `POST /api/nessie/sync` pulls accounts + purchases, maps them deterministically into `NormalizedTransaction[]`, and upserts into `transactions_normalized`.
- Deterministic engine remains the source of truth; Nessie is only a data source.
- Demo safety: if Nessie is disabled or fails, the UI falls back to Demo Data (never blocks judging).

**30-second demo**

1. Go to `/app` and click **Connect Capital One Nessie**.
2. Wait for **Syncing…**, then land on the Mosaic.
3. Re-run analysis: it uses cached normalized transactions (no sponsor network calls required for reruns).
