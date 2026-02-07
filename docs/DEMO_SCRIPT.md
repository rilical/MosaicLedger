# Demo Script (Rehearsal)

## Visa Track Segment (30s) (VISA-012)

1. Start at `/app` and click **Use Demo Data** (fail-safe path for judging).
2. Go to **Recurring**:
   - Call out: “We detect recurring charges and predict the next date.”
   - Crisp metric: “Next 30 days upcoming recurring total is shown here.”
   - Take one action: mark a subscription **Cancel** (Subscription Manager).
3. Go to **Plan**:
   - Call out: “This is deterministic decision support. No AI required for numbers.”
   - Crisp action: click **Use cap** on the top overspend category (e.g. Housing), and point to the
     ranked action list updating around that goal.
4. Close with one line:
   - “The mural is the primary UI, and the plan turns fragments into a ranked list of next actions
     with quantified monthly savings.”

## Conway Track Segment (30s) (CONWAY-012)

1. Start at `/app` and click **Use Demo Data** (fail-safe path).
2. Go to **Plan** and open **Coach**.
3. Ask: “What subscriptions should I cancel?”
   - Call out: “The coach routes the question into deterministic tools: recurring detection + action
     plan. It does not invent numbers.”
   - Point to the coach response listing recurring items and a recommended cancel action with
     `$ / mo`.
4. Click **Jump** on the recommended action to scroll to that action in the plan list.
5. Backup prompt if network/AI is down:
   - Toggle **AI Explanations** OFF and ask again. The coach still responds in Offline mode with
     deterministic numbers.

## Ripple Track Segment (20s) (XRPLP-010) (Optional)

This segment is optional and must never sink the demo.

1. Settings: toggle `XRPL` ON (leave Demo/Judge ON).
2. Open `/app/xrpl`.
3. Point at the deterministic round-up total (micro-savings).
4. Click **Simulate Receipt**.
5. Show the receipt: mode + amount + tx hash.
6. Say: “No seeds client-side. If XRPL testnet is unstable, we still show deterministic simulated receipts.”
