# MosaicLedger — Judge & Investor Script

This document explains **every aspect** of the MosaicLedger web app so judges and investors can evaluate it fairly and run a reliable demo.

---

## 1. What MosaicLedger Is

**Tagline:** *Enter with fragments. Leave with something whole.*

MosaicLedger is a **visual-first budget planner** that:

1. Turns transaction data into an **explorable mosaic** (treemap) so you see spend shape at a glance.
2. **Detects recurring charges** (subscriptions, bills) and predicts the next charge date.
3. Produces a **ranked action plan** with quantified monthly savings and explainable logic.

The core engine is **deterministic**: numbers (totals, tiles, recurring, actions) are computed with fixed rules. AI is optional and only used to rewrite explanations—it never changes the math.

---

## 2. Tech Stack & Repo Layout

- **Monorepo:** pnpm workspaces.
- **Web app:** Next.js (App Router) in `apps/web` — React, TypeScript, server and client components.
- **Packages:**
  - **`packages/core`** — Transaction normalization, categorization, filters, date utils, **recurring detection**, **summary**, **action recommendations**. Single source of truth for types and engine math.
  - **`packages/mosaic`** — Treemap layout (d3-hierarchy), tile colors, **poster export** (SVG/PNG).
  - **`packages/banking`** — Demo dataset (JSON), Plaid fixture for tests; bank API adapters (Plaid-first).
  - **`packages/xrpl`** — XRPL round-up scaffolding (optional).
  - **`packages/mcp-server`** — MCP tool server (scaffold).
- **Backend:** Next.js API routes under `apps/web/src/app/api/`. Optional **Supabase** (auth, DB for analysis runs and Plaid item/transaction storage). **Plaid** for bank linking when enabled.
- **Data flow:** User picks a source (demo or bank) → **POST /api/engine/analyze** with range/filters/goal → server runs `computeDemoArtifacts` or `computeBankArtifacts` (same pipeline, different input) → returns **artifacts** (summary, mosaic tiles, recurring, actionPlan). UI never invents fields; it consumes these contracts.

---

## 3. Data Sources

| Source | When it’s used | Requirements |
|--------|-----------------|--------------|
| **Demo data** | Default for judges; “Use Demo Data” or Demo Mode ON; or no bank linked. | None. Always works. No keys. |
| **Bank (Plaid)** | User clicks “Connect Bank” and completes Plaid Link; then analyze uses DB-backed or live Plaid transactions. | Plaid env vars; Supabase for storing items/transactions. |
| **Plaid fixture** | When Plaid is disabled or server uses fixture mode (e.g. sandbox fallback). | Same as demo from the user’s perspective. |

- **Demo dataset:** Lives in `packages/banking` (`demoDataset.json`). Curated transactions so the mosaic is non-empty, recurring items are detected, and the plan has meaningful actions. Used in CI and as the “always works” path.
- **Judge Mode / Demo Mode:** In **Settings** → **Settings** drawer, judges can turn **Judge Mode** and **Demo Mode** ON. That forces the always-works path (no auth, no live Plaid), so the demo doesn’t depend on external services.

---

## 4. App Structure & Routes

- **`/`** — Landing page. Explains product; links to “Enter the app”, “See the mosaic”, “View the plan”, “Login”, “Settings”.
- **`/login`** — Supabase magic-link login (used when Demo/Judge mode are off and app requires auth).
- **`/app`** — **Connect** page: choose “Connect Bank (Plaid)” or **“Use Demo Data”**. This is the intended starting point for judges.
- **`/app/mosaic`** — Main dashboard: **Month Mosaic** (treemap), **Recurring** panel, **Next Actions** panel. Shared **AnalysisControls** (range, filters, Recompute).
- **`/app/recurring`** — Recurring-focused view: same analysis, **Subscription Manager** (Keep / Cancel / Downgrade per item), **Upcoming Bills (Next 30 Days)** with total.
- **`/app/plan`** — **Scenario (Before/After)** spend, **Budget by Category** (spend, suggested cap, delta, “Use cap” goal), **Top Actions** with checkboxes and “Top 1 / Top 3 / All”. Subscription choices from Recurring affect which “cancel” actions appear.
- **`/app/export`** — **Export Poster**: SVG/PNG download of mosaic + legend + top plan items. **Privacy mode** redacts merchant names in the plan summary.
- **`/app/bank`** — Plaid Link flow: get link token → open Plaid Link → exchange token → redirect to mosaic. Optional; “Use Demo Data Instead” always available.
- **`/app/settings`** — Runtime flags (Settings drawer), “Forget this device” (clear localStorage). Optional “Expo reset” when enabled.
- **`/health`** — Health check: demo dataset availability, optional integrations (Supabase, Plaid, etc.). No secrets. Useful for judges to confirm environment.

All analysis-driven pages (Mosaic, Recurring, Plan, Export) share the same **analysis request** (range, filters, goal). Changing range or filters and clicking **Recompute** refreshes artifacts everywhere.

---

## 5. Core Engine (Deterministic Pipeline)

Everything below is in **packages/core** (and **packages/mosaic** for layout). No AI in this pipeline.

1. **Input:** Raw transactions (date, name/merchant, amount, optional category) from demo or bank.
2. **Normalize:** Canonical merchant names, categories, spend-positive amounts, `YYYY-MM-DD` dates. Source: `csv` | `bank` | `demo`.
3. **Filters:** Optional exclusions (e.g. refunds, transfers) applied before range.
4. **Range:** “This month”, “Last month”, or custom start/end. For demo, “this month” is relative to the **latest transaction date** in the dataset so the mosaic isn’t empty.
5. **Summarize:** `byCategory`, `byMerchant`, `totalSpend`, and **recurring detection** (median cadence, next date, confidence). Recurring uses merchant-level patterns (e.g. ≥3 occurrences, stable intervals).
6. **Treemap:** `packages/mosaic` builds tiles from `byCategory` (d3 treemap); each tile = category, size = spend, color by label.
7. **Recommend:** Action list:
   - **Goal-based cap** (if user set “Use cap” on a category).
   - **Cancel** actions for each detected recurring charge (monthly savings = recurring amount).
   - **Cap** actions for top categories (e.g. 25% reduction), excluding the goal category if set.
   - **Substitute**-type suggestions (e.g. swap a habit).
   - Each action has: title, target (merchant or category), `expectedMonthlySavings`, effort score, confidence, explanation, reasons (bullet points).

Contracts (types) live in **packages/core/src/types.ts**. The web app and API only use these; they don’t invent new fields.

---

## 6. Key Features (What to Show)

- **Mosaic (treemap):** Primary visual. Tiles = spending by category; hover shows category name and amount. Conveys “where money went” in one view.
- **AnalysisControls:** On Mosaic, Recurring, Plan, Export. Range dropdown (This month / Last month / Custom), optional date pickers for custom, “Exclude transfers”, “Exclude refunds”, **Recompute**, status badge (Busy / Ready / Error).
- **Recurring:** Detected subscriptions with merchant, cadence, next date, confidence, monthly equivalent, annual. **Subscription Manager:** Keep / Cancel / Downgrade. Choices persist (localStorage) and affect Plan: “Cancel” actions for merchants marked “Keep” are hidden.
- **Upcoming Bills (Next 30 Days):** Subset of recurring with next date in the next 30 days; total upcoming amount.
- **Plan — Scenario:** Before spend (selected range), After spend (after applying selected actions), Estimated monthly savings. Toggles to select which actions apply; “Top 1”, “Top 3”, “All” shortcuts.
- **Plan — Budget by Category:** Table: category, spend, suggested cap, delta. “Use cap” sets a **goal** (monthly cap for that category); the engine then adds a cap action and ranks it. “Reset goal” clears it.
- **Plan — Top Actions:** List of recommendations with checkboxes; selecting them updates the scenario. Explainability: each action has reasons/explanation (deterministic; optional AI rewrite only for wording).
- **Export:** One poster = mosaic + legend + top 5 plan items. Download as SVG or PNG. Privacy mode redacts merchant names in plan text.

---

## 7. Step-by-Step Demo Script for Judges

**Pre-requisites:** `pnpm install`, `pnpm dev`. Open `http://localhost:3000`.

### Option A — Fast path (no login, ~60–90 seconds)

1. Go to **http://localhost:3000/app**.
2. Click **“Use Demo Data”** (no bank, no keys).
3. You’re on **Mosaic**. Wait for “Ready” (and non-empty mosaic).
4. **Call out:** “The mural is the primary UI—each tile is a spending category; hover to see the amount.”
5. In the **Recurring** card, point out detected items and next dates. **Call out:** “We detect recurring charges and predict the next 30 days.”
6. In **Subscription Manager**, click **Cancel** on one item. **Call out:** “User intent is captured; the Plan page will hide the cancel action for items marked Keep.”
7. Go to **Recurring** (nav). Show **Upcoming Bills (Next 30 Days)** and total.
8. Go to **Plan**. **Call out:** “Deterministic decision support—no AI required for the numbers.”
9. In **Budget by Category**, click **Use cap** on the top overspend category. **Call out:** “The ranked action list updates with a cap goal.”
10. Use **Top 1** / **Top 3** and show Before / After / Estimated savings.
11. Go to **Export**. Toggle **Privacy mode**, then **Download SVG** or **Download PNG**. **Call out:** “One-click poster of mosaic + plan.”
12. (Optional) Open **Settings** → **Settings** drawer. Turn **Judge Mode** and **Demo Mode** ON. **Call out:** “If anything external flakes, judges can force the always-works path.”

### Option B — With Judge hardening first

1. Go to **http://localhost:3000/app/settings**.
2. Open **Settings** → set **Judge Mode** ON, **Demo Mode** ON → **Done**.
3. Go to **http://localhost:3000/app** → **Use Demo Data**.
4. Then follow from step 3 of Option A.

### What to say in one line

*“The mural is the primary UI; the plan turns fragments into a ranked list of next actions with quantified monthly savings, and everything is deterministic and explainable.”*

---

## 8. Business & Positioning (For Investors)

- **Positioning:** Visual layer + decision layer on top of transaction data. Explainable, deterministic core.
- **Initial ICP:** Students, early-career professionals, financial coaches.
- **Monetization (planned):** Freemium (CSV + mosaic + recurring + basic actions); Pro (bank sync, forecasting, enrichment, group modes); B2B (coaching dashboards).
- **Risks:** Bank data is sensitive (minimize storage, encrypt, clear opt-in). Recommendations stay explainable; avoid positioning as regulated “financial advice.”

---

## 9. Judging Tips & Troubleshooting

| Issue | What to do |
|------|------------|
| Mosaic empty or “Error” | Use **Use Demo Data**. If already on demo, open **Settings** → turn **Judge Mode** and **Demo Mode** ON, then reload. Or go to **/app** and click **Use Demo Data** again. |
| Slow or hanging | On Mosaic, if a “Switch to demo data” button appears, click it. Or enable Judge + Demo in Settings and reload. |
| Want to verify environment | Open **/health**. Check demo dataset and optional integrations. |
| Plaid / bank not needed | Demo is the judged path. Bank connection is optional; “Use Demo Data” is the recommended path for competition. |
| Clear local state | **Settings** → **Forget this device** (or **Expo reset** if shown). Then **Use Demo Data** again. |

---

## 10. Quick Reference — Where Things Live

| What | Where |
|------|--------|
| Demo dataset | `packages/banking` (demo) |
| Engine (normalize, summarize, recurring, recommend) | `packages/core` |
| Treemap + export | `packages/mosaic` |
| Analyze API (POST/GET) | `apps/web/src/app/api/engine/analyze/route.ts` |
| Compute (demo vs bank) | `apps/web/src/lib/analysis/compute.ts` |
| Mosaic UI | `apps/web/src/components/MosaicView.tsx`, `app/app/mosaic/page.tsx` |
| Recurring panel + Subscription choices | `RecurringPanel.tsx`, `lib/subscriptions/choices.ts` |
| Plan page (goals, scenario, actions) | `app/app/plan/page.tsx`, `ActionsPanel`, `usePlanGoal` |
| AnalysisControls (range, filters, Recompute) | `components/Analysis/AnalysisControls.tsx` |
| Types (single source of truth) | `packages/core/src/types.ts` |
| Health check | `/health` |

---

This script explains every aspect of the web app: product, architecture, data flow, routes, engine, features, demo steps, business notes, and judging tips. Judges and investors can use it to run a consistent demo and evaluate MosaicLedger fairly.
