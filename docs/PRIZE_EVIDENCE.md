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

**What we built**

- In-app Coach UI: `/app/coach`
- Server route: `POST /api/coach/run`
- Tool calling: local deterministic tools executed server-side (engine analysis, scenario, poster render)
- Optional hosted MCP tool calling via `DEDALUS_MCP_SERVER_URL`
- Multi-model handoff: coordinator model produces structured output, narrator model writes the final answer
- Multimodal (vision): `Poster audit (vision)` mode renders a poster PNG and asks a vision-capable model to audit it
- Trace viewer: "View tool trace" drawer is screenshot-ready (timing + redacted I/O)

**Env vars**

- `DEDALUS_API_KEY`
- `DEDALUS_MCP_SERVER_URL` (optional)
- `DEDALUS_COORDINATOR_MODEL` (optional)
- `DEDALUS_NARRATOR_MODEL` (optional)
- `DEDALUS_VISION_MODEL` (optional)

**Screenshot checklist**

- `/app/coach` showing `Models: ... -> ...` and `Tools: ...`
- Tool trace drawer showing at least:
  - `run_engine_analysis`
  - `render_latest_poster_png`
  - `simulate_scenario` (optional but good)
- Poster audit run showing the vision model included in `Models: ...`
