export const DEFAULT_RECONCILE_CONFIG = {
    amountTolerance: 0.01,
    amountBand: 1.0,
    dateWindowDays: 3,
    scoreThreshold: 0.72,
    duplicateThreshold: 0.86,
    weights: { amount: 0.45, date: 0.25, vendor: 0.3 },
};
function clamp01(n) {
    if (n <= 0)
        return 0;
    if (n >= 1)
        return 1;
    return n;
}
function absDaysBetween(a, b) {
    const da = new Date(a + 'T00:00:00Z');
    const db = new Date(b + 'T00:00:00Z');
    const diff = Math.abs(db.getTime() - da.getTime());
    return Math.round(diff / (24 * 60 * 60 * 1000));
}
function tokenize(input) {
    return input
        .toUpperCase()
        .split(/[^A-Z0-9]+/g)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}
function jaccard(a, b) {
    if (a.length === 0 || b.length === 0)
        return 0;
    const sa = new Set(a);
    const sb = new Set(b);
    let inter = 0;
    for (const t of sa) {
        if (sb.has(t))
            inter++;
    }
    const union = sa.size + sb.size - inter;
    return union <= 0 ? 0 : inter / union;
}
function severityForAmount(absAmount) {
    if (absAmount >= 500)
        return 'high';
    if (absAmount >= 100)
        return 'med';
    return 'low';
}
function amountScore(ledgerAmt, txnAmt, cfg) {
    const d = Math.abs(ledgerAmt - txnAmt);
    if (d <= cfg.amountTolerance)
        return 1;
    if (d >= cfg.amountBand)
        return 0;
    return clamp01(1 - d / cfg.amountBand);
}
function dateScore(ledgerDate, txnDate, cfg) {
    const d = absDaysBetween(ledgerDate, txnDate);
    if (d >= cfg.dateWindowDays)
        return 0;
    return clamp01(1 - d / cfg.dateWindowDays);
}
function vendorScore(ledgerVendor, txnVendor) {
    if (!ledgerVendor || !txnVendor)
        return 0;
    if (ledgerVendor === txnVendor)
        return 1;
    return jaccard(tokenize(ledgerVendor), tokenize(txnVendor));
}
export function reconcileLedgerToBank(ledgerEntries, txns, config = {}) {
    const cfg = {
        ...DEFAULT_RECONCILE_CONFIG,
        ...config,
        weights: { ...DEFAULT_RECONCILE_CONFIG.weights, ...(config.weights ?? {}) },
    };
    const matches = [];
    const exceptions = [];
    const usedTxnIds = new Set();
    for (const le of ledgerEntries) {
        let best = null;
        for (const t of txns) {
            const dDays = absDaysBetween(le.date, t.date);
            if (dDays > cfg.dateWindowDays)
                continue;
            const vScore = vendorScore(le.vendorCanonical, t.merchant);
            if (vScore < 0.2)
                continue;
            const aScore = amountScore(le.amount, t.amount, cfg);
            if (aScore <= 0)
                continue;
            const dtScore = dateScore(le.date, t.date, cfg);
            const score = cfg.weights.amount * aScore + cfg.weights.date * dtScore + cfg.weights.vendor * vScore;
            if (!best || score > best.score) {
                best = {
                    ledgerId: le.id,
                    txnId: t.id,
                    score: clamp01(score),
                    reasons: [],
                    vendor: vScore,
                    amt: aScore,
                    date: dtScore,
                    txn: t,
                };
            }
        }
        if (best && best.score >= cfg.scoreThreshold) {
            const reasons = [
                `amountScore=${best.amt.toFixed(2)}`,
                `dateScore=${best.date.toFixed(2)}`,
                `vendorScore=${best.vendor.toFixed(2)}`,
            ];
            matches.push({
                ledgerId: le.id,
                txnId: best.txnId,
                score: Number(best.score.toFixed(4)),
                reasons,
            });
            usedTxnIds.add(best.txnId);
            continue;
        }
        // Deterministic "near match" exceptions: attempt to attach evidence to help ops triage.
        let bestVendor = null;
        for (const t of txns) {
            const v = vendorScore(le.vendorCanonical, t.merchant);
            if (!bestVendor || v > bestVendor.v) {
                bestVendor = { txn: t, v, a: Math.abs(le.amount - t.amount), d: absDaysBetween(le.date, t.date) };
            }
        }
        if (bestVendor && bestVendor.v >= 0.85) {
            if (bestVendor.d <= cfg.dateWindowDays && bestVendor.a > cfg.amountTolerance) {
                exceptions.push({
                    kind: 'amount_mismatch',
                    severity: severityForAmount(Math.abs(le.amount)),
                    ledgerEntry: le,
                    txn: bestVendor.txn,
                    evidence: [
                        `vendorMatch=${bestVendor.v.toFixed(2)}`,
                        `amountDelta=${(le.amount - bestVendor.txn.amount).toFixed(2)}`,
                    ],
                });
                continue;
            }
            if (bestVendor.a <= cfg.amountTolerance && bestVendor.d > cfg.dateWindowDays) {
                exceptions.push({
                    kind: 'date_mismatch',
                    severity: severityForAmount(Math.abs(le.amount)),
                    ledgerEntry: le,
                    txn: bestVendor.txn,
                    evidence: [`vendorMatch=${bestVendor.v.toFixed(2)}`, `dateDeltaDays=${bestVendor.d}`],
                });
                continue;
            }
        }
        exceptions.push({
            kind: 'unmatched_ledger',
            severity: severityForAmount(Math.abs(le.amount)),
            ledgerEntry: le,
            evidence: ['noMatchAboveThreshold'],
        });
    }
    // Unmatched bank transactions.
    for (const t of txns) {
        if (usedTxnIds.has(t.id))
            continue;
        exceptions.push({
            kind: 'unmatched_bank',
            severity: severityForAmount(Math.abs(t.amount)),
            txn: t,
            evidence: ['notMatchedToLedger'],
        });
    }
    // Duplicate suspects: multiple ledger entries matched to the same bank txn with high confidence.
    const byTxn = new Map();
    for (const m of matches) {
        const arr = byTxn.get(m.txnId) ?? [];
        arr.push(m);
        byTxn.set(m.txnId, arr);
    }
    for (const [txnId, ms] of byTxn) {
        const strong = ms.filter((m) => m.score >= cfg.duplicateThreshold);
        if (strong.length < 2)
            continue;
        // Deterministic: sort by ledger id so we always flag the same ones.
        const sorted = strong.slice().sort((a, b) => a.ledgerId.localeCompare(b.ledgerId));
        for (const m of sorted) {
            const le = ledgerEntries.find((x) => x.id === m.ledgerId);
            const txn = txns.find((x) => x.id === txnId);
            exceptions.push({
                kind: 'duplicate_suspect',
                severity: 'high',
                ledgerEntry: le,
                txn,
                evidence: [`sharedTxnId=${txnId}`, `matchCount=${sorted.length}`, `score=${m.score}`],
            });
        }
    }
    // Deterministic ordering for consumers + tests.
    const severityRank = { high: 0, med: 1, low: 2 };
    matches.sort((a, b) => a.ledgerId.localeCompare(b.ledgerId) || b.score - a.score);
    exceptions.sort((a, b) => {
        const sa = severityRank[a.severity];
        const sb = severityRank[b.severity];
        if (sa !== sb)
            return sa - sb;
        if (a.kind !== b.kind)
            return a.kind < b.kind ? -1 : 1;
        const la = a.ledgerEntry?.id ?? '';
        const lb = b.ledgerEntry?.id ?? '';
        if (la !== lb)
            return la < lb ? -1 : 1;
        const ta = a.txn?.id ?? '';
        const tb = b.txn?.id ?? '';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
    return { matches, exceptions };
}
//# sourceMappingURL=reconcile.js.map