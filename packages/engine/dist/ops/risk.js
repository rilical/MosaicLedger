import { stableId } from '@mosaicledger/core';
export const DEFAULT_OPS_RISK_CONFIG = {
    vendorConcentration: { medShare: 0.25, highShare: 0.35 },
    velocitySpike: { kStd: 2.0, minRatio: 1.3, lookbackWeeks: 6 },
    unusualAmount: { percentile: 0.95, multiplier: 1.5 },
    roundAmountsCluster: { minCount: 6, minShare: 0.35 },
    rapidRefunds: { windowDays: 14, minCount: 3 },
    // Hackathon config defaults: "Transfer" is a good demo-safe policy category because it's in the demo dataset.
    policyViolation: { blockedCategories: ['transfer', 'gambling', 'adult', 'crypto'] },
};
function clamp01(n) {
    if (n <= 0)
        return 0;
    if (n >= 1)
        return 1;
    return n;
}
function severityForShare(share, cfg) {
    if (share >= cfg.highShare)
        return 'high';
    if (share >= cfg.medShare)
        return 'med';
    return 'low';
}
function toDayMs(date) {
    return new Date(date + 'T00:00:00Z').getTime();
}
function mean(xs) {
    if (xs.length === 0)
        return 0;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function std(xs) {
    if (xs.length === 0)
        return 0;
    const m = mean(xs);
    const v = mean(xs.map((x) => (x - m) ** 2));
    return Math.sqrt(v);
}
function percentile(xs, p) {
    if (xs.length === 0)
        return 0;
    const sorted = xs.slice().sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[idx] ?? 0;
}
function riskId(kind, parts) {
    return stableId(['opsrisk', kind, ...parts]);
}
export function computeOpsRiskFlags(ledgerEntries, txns, _recon, config = {}) {
    const cfg = {
        ...DEFAULT_OPS_RISK_CONFIG,
        ...config,
        vendorConcentration: { ...DEFAULT_OPS_RISK_CONFIG.vendorConcentration, ...(config.vendorConcentration ?? {}) },
        velocitySpike: { ...DEFAULT_OPS_RISK_CONFIG.velocitySpike, ...(config.velocitySpike ?? {}) },
        unusualAmount: { ...DEFAULT_OPS_RISK_CONFIG.unusualAmount, ...(config.unusualAmount ?? {}) },
        roundAmountsCluster: { ...DEFAULT_OPS_RISK_CONFIG.roundAmountsCluster, ...(config.roundAmountsCluster ?? {}) },
        rapidRefunds: { ...DEFAULT_OPS_RISK_CONFIG.rapidRefunds, ...(config.rapidRefunds ?? {}) },
        policyViolation: { ...DEFAULT_OPS_RISK_CONFIG.policyViolation, ...(config.policyViolation ?? {}) },
    };
    const flags = [];
    const outflows = txns.filter((t) => Number.isFinite(t.amount) && t.amount > 0);
    const totalOutflow = outflows.reduce((acc, t) => acc + t.amount, 0);
    // vendor_concentration
    if (totalOutflow > 0) {
        const byVendor = new Map();
        for (const t of outflows) {
            byVendor.set(t.merchant, (byVendor.get(t.merchant) ?? 0) + t.amount);
        }
        const top = Array.from(byVendor.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        if (top) {
            const [vendor, amt] = top;
            const share = amt / totalOutflow;
            const sev = severityForShare(share, cfg.vendorConcentration);
            if (sev !== 'low') {
                flags.push({
                    id: riskId('vendor_concentration', [vendor]),
                    kind: 'vendor_concentration',
                    severity: sev,
                    entities: { vendorCanonical: vendor },
                    metrics: { totalOutflow, topVendorOutflow: amt, topVendorShare: Number(share.toFixed(4)) },
                    why: [
                        `Top vendor ${vendor} is ${(share * 100).toFixed(1)}% of outflow.`,
                    ],
                });
            }
        }
    }
    // velocity_spike (7d vs prior weekly windows)
    if (outflows.length >= 14) {
        const dates = outflows.map((t) => t.date).sort();
        const end = dates[dates.length - 1];
        const endMs = toDayMs(end);
        const windowMs = 7 * 24 * 60 * 60 * 1000;
        const last7Start = endMs - windowMs;
        const last7 = outflows.filter((t) => {
            const ms = toDayMs(t.date);
            return ms > last7Start && ms <= endMs;
        });
        const last7Total = last7.reduce((a, t) => a + t.amount, 0);
        const weeklyTotals = [];
        for (let w = 1; w <= cfg.velocitySpike.lookbackWeeks; w++) {
            const wEnd = endMs - w * windowMs;
            const wStart = wEnd - windowMs;
            const total = outflows
                .filter((t) => {
                const ms = toDayMs(t.date);
                return ms > wStart && ms <= wEnd;
            })
                .reduce((a, t) => a + t.amount, 0);
            weeklyTotals.push(total);
        }
        const m = mean(weeklyTotals);
        const s = std(weeklyTotals);
        const ratio = m > 0 ? last7Total / m : 0;
        const spike = last7Total > m + cfg.velocitySpike.kStd * s && ratio >= cfg.velocitySpike.minRatio;
        if (spike) {
            const sev = ratio >= 2.0 ? 'high' : ratio >= 1.6 ? 'med' : 'low';
            flags.push({
                id: riskId('velocity_spike', [end]),
                kind: 'velocity_spike',
                severity: sev,
                entities: {},
                metrics: {
                    last7Total,
                    priorMean7d: m,
                    priorStd7d: s,
                    ratio: Number(ratio.toFixed(3)),
                },
                why: ['Last 7 days outflow is elevated vs prior weeks.'],
            });
        }
    }
    // unusual_amount
    const amounts = outflows.map((t) => t.amount);
    const p = percentile(amounts, cfg.unusualAmount.percentile);
    const threshold = p * cfg.unusualAmount.multiplier;
    if (threshold > 0) {
        const unusual = outflows.filter((t) => t.amount >= threshold);
        if (unusual.length) {
            const max = unusual.reduce((a, t) => Math.max(a, t.amount), 0);
            const vendor = unusual.slice().sort((a, b) => b.amount - a.amount || a.merchant.localeCompare(b.merchant))[0];
            flags.push({
                id: riskId('unusual_amount', [vendor.merchant]),
                kind: 'unusual_amount',
                severity: max >= threshold * 1.5 ? 'high' : 'med',
                entities: { vendorCanonical: vendor.merchant, accountId: vendor.accountId },
                metrics: { threshold, count: unusual.length, max },
                why: ['One or more transactions exceed an unusual-amount threshold.'],
            });
        }
    }
    // policy_violation (category blocked list)
    const blocked = new Set(cfg.policyViolation.blockedCategories.map((s) => s.toLowerCase()));
    const viol = outflows.filter((t) => blocked.has(t.category.trim().toLowerCase()));
    if (viol.length) {
        const amt = viol.reduce((a, t) => a + t.amount, 0);
        flags.push({
            id: riskId('policy_violation', ['blocked_categories']),
            kind: 'policy_violation',
            severity: amt >= 250 ? 'high' : 'med',
            entities: {},
            metrics: { count: viol.length, totalAmount: amt },
            why: ['Transactions found in blocked categories (config-driven).'],
        });
    }
    // round_amounts_cluster
    const round = outflows.filter((t) => Math.abs(t.amount - Math.round(t.amount)) < 1e-9);
    if (outflows.length) {
        const share = round.length / outflows.length;
        if (round.length >= cfg.roundAmountsCluster.minCount && share >= cfg.roundAmountsCluster.minShare) {
            flags.push({
                id: riskId('round_amounts_cluster', ['all']),
                kind: 'round_amounts_cluster',
                severity: round.length >= cfg.roundAmountsCluster.minCount * 2 ? 'high' : 'med',
                entities: {},
                metrics: { count: round.length, share: Number(share.toFixed(4)) },
                why: ['High cluster of round-dollar amounts (heuristic).'],
            });
        }
    }
    // after_hours_spend (heuristic: weekends, since time-of-day is often unavailable)
    const weekend = outflows.filter((t) => {
        const d = new Date(t.date + 'T00:00:00Z');
        const day = d.getUTCDay(); // 0 Sun .. 6 Sat
        return day === 0 || day === 6;
    });
    if (weekend.length >= 5) {
        const amt = weekend.reduce((a, t) => a + t.amount, 0);
        flags.push({
            id: riskId('after_hours_spend', ['weekend']),
            kind: 'after_hours_spend',
            severity: amt >= 400 ? 'high' : 'med',
            entities: {},
            metrics: { count: weekend.length, totalAmount: amt },
            why: ['Weekend activity flagged as after-hours heuristic (no time-of-day data).'],
        });
    }
    // rapid_refunds (negative amounts)
    const refunds = txns.filter((t) => Number.isFinite(t.amount) && t.amount < 0);
    if (refunds.length) {
        const byVendor = new Map();
        for (const r of refunds) {
            byVendor.set(r.merchant, [...(byVendor.get(r.merchant) ?? []), r]);
        }
        for (const [vendor, rows] of byVendor) {
            const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
            if (sorted.length < cfg.rapidRefunds.minCount)
                continue;
            const first = sorted[0].date;
            const last = sorted[sorted.length - 1].date;
            const spanDays = Math.round((toDayMs(last) - toDayMs(first)) / (24 * 60 * 60 * 1000));
            if (spanDays <= cfg.rapidRefunds.windowDays) {
                const amt = sorted.reduce((a, t) => a + Math.abs(t.amount), 0);
                flags.push({
                    id: riskId('rapid_refunds', [vendor]),
                    kind: 'rapid_refunds',
                    severity: amt >= 200 ? 'high' : 'med',
                    entities: { vendorCanonical: vendor },
                    metrics: { count: sorted.length, spanDays, totalAbsRefunds: amt },
                    why: ['Multiple refunds for the same vendor in a short window.'],
                });
            }
        }
    }
    // duplicate_invoices (ledger side)
    const byInv = new Map();
    for (const le of ledgerEntries) {
        const inv = (le.invoiceId ?? '').trim();
        if (!inv)
            continue;
        byInv.set(inv, [...(byInv.get(inv) ?? []), le]);
    }
    for (const [inv, rows] of byInv) {
        if (rows.length < 2)
            continue;
        const total = rows.reduce((a, r) => a + Math.abs(r.amount), 0);
        flags.push({
            id: riskId('duplicate_invoices', [inv]),
            kind: 'duplicate_invoices',
            severity: total >= 250 ? 'high' : 'med',
            entities: {},
            metrics: { invoiceCount: rows.length, totalAbsAmount: total },
            why: [`Invoice ${inv} appears multiple times in the ledger export.`],
        });
    }
    // Deterministic sort.
    const severityRank = { high: 0, med: 1, low: 2 };
    flags.sort((a, b) => {
        const sa = severityRank[a.severity] ?? 9;
        const sb = severityRank[b.severity] ?? 9;
        if (sa !== sb)
            return sa - sb;
        if (a.kind !== b.kind)
            return a.kind < b.kind ? -1 : 1;
        return a.id.localeCompare(b.id);
    });
    return flags;
}
//# sourceMappingURL=risk.js.map