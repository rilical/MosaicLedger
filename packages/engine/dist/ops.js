function clamp01(x) {
    if (x < 0)
        return 0;
    if (x > 1)
        return 1;
    return x;
}
function formatUsd(amount) {
    const sign = amount < 0 ? '-' : '';
    const v = Math.abs(amount);
    return `${sign}$${v.toFixed(2)}`;
}
function severityRank(s) {
    if (s === 'high')
        return 3;
    if (s === 'med')
        return 2;
    return 1;
}
function maxSeverity(a, b) {
    return severityRank(a) >= severityRank(b) ? a : b;
}
function hashId(input) {
    // Fast deterministic hash. Not crypto, but stable and sufficient for ids.
    let h1 = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h1 ^= input.charCodeAt(i);
        h1 = Math.imul(h1, 0x01000193);
    }
    return `ops_${(h1 >>> 0).toString(16)}`;
}
function toUtcDate(d) {
    return new Date(`${d}T00:00:00Z`);
}
function addDays(yyyyMmDd, deltaDays) {
    const dt = toUtcDate(yyyyMmDd);
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return dt.toISOString().slice(0, 10);
}
function isWithinRange(date, range) {
    return date >= range.start && date <= range.end;
}
function cents(amount) {
    return Math.round(amount * 100);
}
function severityColor(sev) {
    // Matches the existing Mosaic palette mood (rose/orange/green).
    if (sev === 'high')
        return '#f43f5e';
    if (sev === 'med')
        return '#f97316';
    return '#22c55e';
}
function analystLabel(a) {
    if (a === 'risk')
        return 'Risk';
    if (a === 'compliance')
        return 'Compliance';
    return 'Reconciliation';
}
function sortFindingsDeterministic(a, b) {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev)
        return sev;
    if (a.analyst !== b.analyst)
        return a.analyst.localeCompare(b.analyst);
    if (a.kind !== b.kind)
        return a.kind.localeCompare(b.kind);
    const am = (b.metrics.value ?? 0) - (a.metrics.value ?? 0);
    if (am)
        return am;
    return a.id.localeCompare(b.id);
}
function makeFinding(input) {
    return {
        id: hashId(input.idSeed),
        analyst: input.analyst,
        kind: input.kind,
        severity: input.severity,
        metrics: input.metrics,
        why: input.why,
        entities: input.entities,
    };
}
function vendorConcentration(txns) {
    const spend = txns.filter((t) => Number.isFinite(t.amount) && t.amount > 0);
    const total = spend.reduce((acc, t) => acc + t.amount, 0);
    if (total <= 0)
        return [];
    const byMerchant = new Map();
    for (const t of spend) {
        const m = t.merchant?.trim() || t.merchantRaw?.trim() || 'Unknown';
        byMerchant.set(m, (byMerchant.get(m) ?? 0) + t.amount);
    }
    let topMerchant = '';
    let topAmount = 0;
    for (const [m, amt] of byMerchant.entries()) {
        if (amt > topAmount || (amt === topAmount && m < topMerchant)) {
            topMerchant = m;
            topAmount = amt;
        }
    }
    const pct = topAmount / total;
    if (pct < 0.2 || topAmount < 150)
        return [];
    const severity = pct >= 0.45 || topAmount >= 1000 ? 'high' : pct >= 0.3 || topAmount >= 500 ? 'med' : 'low';
    return [
        makeFinding({
            idSeed: `vendor_concentration|${topMerchant}|${cents(topAmount)}|${cents(total)}`,
            analyst: 'risk',
            kind: 'vendor_concentration',
            severity,
            metrics: {
                topVendorSpend: topAmount,
                totalSpend: total,
                topVendorPct: clamp01(pct),
                value: topAmount,
            },
            entities: { merchant: topMerchant },
            why: [
                `${topMerchant} is ${Math.round(pct * 100)}% of spend (${formatUsd(topAmount)} of ${formatUsd(total)}).`,
                'High concentration increases operational exposure and dispute risk.',
            ],
        }),
    ];
}
function categorySpike(txns, range) {
    const end = range.end;
    const recentStart = addDays(end, -6);
    const baselineStart = addDays(recentStart, -21);
    const baselineEnd = addDays(recentStart, -1);
    const recent = txns.filter((t) => t.amount > 0 && t.date >= recentStart && t.date <= end);
    const baseline = txns.filter((t) => t.amount > 0 && t.date >= baselineStart && t.date <= baselineEnd);
    const sumBy = (items) => {
        const m = new Map();
        for (const t of items) {
            const c = t.category?.trim() || 'Uncategorized';
            m.set(c, (m.get(c) ?? 0) + t.amount);
        }
        return m;
    };
    const recentBy = sumBy(recent);
    const baseBy = sumBy(baseline);
    const scored = [];
    for (const [cat, recentTotal] of recentBy.entries()) {
        const baseTotal = baseBy.get(cat) ?? 0;
        const recentPerDay = recentTotal / 7;
        const basePerDay = baseTotal / 21;
        if (recentTotal < 120)
            continue;
        if (basePerDay <= 1)
            continue;
        const ratio = recentPerDay / basePerDay;
        if (ratio < 1.8)
            continue;
        scored.push({ category: cat, recentTotal, baseTotal, ratio });
    }
    scored.sort((a, b) => {
        const s = b.ratio * b.recentTotal - a.ratio * a.recentTotal;
        if (s)
            return s;
        return a.category.localeCompare(b.category);
    });
    const out = [];
    for (const x of scored.slice(0, 2)) {
        const severity = x.ratio >= 3 && x.recentTotal >= 300 ? 'high' : x.ratio >= 2.2 ? 'med' : 'low';
        out.push(makeFinding({
            idSeed: `category_spike|${x.category}|${cents(x.recentTotal)}|${cents(x.baseTotal)}`,
            analyst: 'compliance',
            kind: 'category_spike',
            severity,
            metrics: {
                recent7dSpend: x.recentTotal,
                baseline21dSpend: x.baseTotal,
                ratio: x.ratio,
                value: x.recentTotal,
            },
            entities: { category: x.category },
            why: [
                `${x.category} spend spiked ~${x.ratio.toFixed(1)}x in the last 7 days (${formatUsd(x.recentTotal)}).`,
                'Review for policy alignment and unusual spending patterns.',
            ],
        }));
    }
    return out;
}
function duplicateSuspects(txns) {
    const spend = txns.filter((t) => t.amount > 0);
    const groups = new Map();
    for (const t of spend) {
        const m = t.merchant?.trim() || t.merchantRaw?.trim() || 'Unknown';
        const key = `${t.date}|${m}|${cents(t.amount)}`;
        const arr = groups.get(key);
        if (arr)
            arr.push(t);
        else
            groups.set(key, [t]);
    }
    const findings = [];
    for (const [key, arr] of groups.entries()) {
        if (arr.length < 2)
            continue;
        // deterministic sort by id to keep ids stable for same input set
        arr.sort((a, b) => a.id.localeCompare(b.id));
        const sample = arr[0];
        const merchant = sample.merchant?.trim() || sample.merchantRaw?.trim() || 'Unknown';
        const total = arr.reduce((acc, t) => acc + t.amount, 0);
        const severity = arr.length >= 3 || total >= 500 ? 'high' : total >= 200 ? 'med' : 'low';
        findings.push(makeFinding({
            idSeed: `duplicate_suspect|${key}|${arr.length}|${cents(total)}`,
            analyst: 'recon',
            kind: 'duplicate_suspect',
            severity,
            metrics: { count: arr.length, totalSpend: total, value: total },
            entities: { merchant },
            why: [
                `Possible duplicate: ${merchant} ${formatUsd(sample.amount)} on ${sample.date} appears ${arr.length}x.`,
                'Validate duplicates before close (double charges / double postings).',
            ],
        }));
    }
    findings.sort(sortFindingsDeterministic);
    return findings.slice(0, 6);
}
function highFrequencyMerchant(txns) {
    const spend = txns.filter((t) => t.amount > 0);
    const byMerchant = new Map();
    for (const t of spend) {
        const m = t.merchant?.trim() || t.merchantRaw?.trim() || 'Unknown';
        const cur = byMerchant.get(m) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += t.amount;
        byMerchant.set(m, cur);
    }
    const ranked = Array.from(byMerchant.entries())
        .filter(([, v]) => v.count >= 6 && v.total >= 120)
        .map(([merchant, v]) => ({ merchant, ...v }))
        .sort((a, b) => {
        const s = b.count - a.count;
        if (s)
            return s;
        const t = b.total - a.total;
        if (t)
            return t;
        return a.merchant.localeCompare(b.merchant);
    });
    const out = [];
    for (const x of ranked.slice(0, 3)) {
        const severity = x.count >= 12 || x.total >= 600 ? 'high' : x.count >= 9 || x.total >= 300 ? 'med' : 'low';
        out.push(makeFinding({
            idSeed: `high_frequency|${x.merchant}|${x.count}|${cents(x.total)}`,
            analyst: 'risk',
            kind: 'high_frequency_merchant',
            severity,
            metrics: { txnCount: x.count, totalSpend: x.total, value: x.total },
            entities: { merchant: x.merchant },
            why: [
                `${x.merchant} appears ${x.count} times in the selected range (${formatUsd(x.total)}).`,
                'High frequency can indicate leakage, abuse, or operational drift.',
            ],
        }));
    }
    return out;
}
function roundAmountCluster(txns) {
    const spend = txns.filter((t) => t.amount > 0);
    if (spend.length < 12)
        return [];
    let roundCount = 0;
    let roundTotal = 0;
    for (const t of spend) {
        const c = Math.abs(cents(t.amount)) % 100;
        if (c === 0) {
            roundCount += 1;
            roundTotal += t.amount;
        }
    }
    const pct = roundCount / spend.length;
    if (roundCount < 10 || pct < 0.55)
        return [];
    const severity = pct >= 0.75 || roundTotal >= 800 ? 'high' : pct >= 0.65 ? 'med' : 'low';
    return [
        makeFinding({
            idSeed: `round_cluster|${roundCount}|${spend.length}|${cents(roundTotal)}`,
            analyst: 'compliance',
            kind: 'round_amounts_cluster',
            severity,
            metrics: {
                roundTxnCount: roundCount,
                txnCount: spend.length,
                roundSpend: roundTotal,
                roundPct: clamp01(pct),
                value: roundTotal,
            },
            entities: {},
            why: [
                `${Math.round(pct * 100)}% of transactions are round-dollar amounts (${roundCount} of ${spend.length}).`,
                'Round amounts can correlate with policy/limit workarounds (heuristic).',
            ],
        }),
    ];
}
function buildBriefs(findings) {
    const byAnalyst = new Map();
    for (const f of findings) {
        const arr = byAnalyst.get(f.analyst);
        if (arr)
            arr.push(f);
        else
            byAnalyst.set(f.analyst, [f]);
    }
    const analysts = ['risk', 'compliance', 'recon'];
    const briefs = [];
    for (const analyst of analysts) {
        const items = (byAnalyst.get(analyst) ?? []).slice().sort(sortFindingsDeterministic);
        if (!items.length)
            continue;
        let sev = 'low';
        for (const f of items)
            sev = maxSeverity(sev, f.severity);
        const bullets = [];
        for (const f of items.slice(0, 5)) {
            const entity = f.entities.merchant ?? f.entities.category ?? f.kind;
            const value = f.metrics.value ?? f.metrics.totalSpend ?? f.metrics.recent7dSpend ?? 0;
            bullets.push(`${entity}: ${formatUsd(value)} (${f.severity})`);
        }
        const nextSteps = analyst === 'recon'
            ? [
                'Confirm duplicate suspects (same merchant + amount + day).',
                'Validate any missing/late postings before close.',
                'Document adjustments with evidence.',
            ]
            : analyst === 'compliance'
                ? [
                    'Review category spikes against policy.',
                    'Investigate round-amount clusters for threshold behavior.',
                    'Escalate high-severity items with metrics.',
                ]
                : [
                    'Review vendor concentration exposure.',
                    'Investigate high-frequency merchants for leakage.',
                    'Create mitigation tasks with owners and due dates.',
                ];
        briefs.push({ analyst, severity: sev, bullets, nextSteps, findings: items });
    }
    briefs.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    return briefs;
}
function buildTiles(findings) {
    const tiles = findings.map((f) => {
        const entity = f.entities.merchant ?? f.entities.category ?? analystLabel(f.analyst);
        const labelPrefix = f.kind === 'vendor_concentration'
            ? 'Concentration'
            : f.kind === 'category_spike'
                ? 'Spike'
                : f.kind === 'duplicate_suspect'
                    ? 'Duplicate'
                    : f.kind === 'high_frequency_merchant'
                        ? 'Frequency'
                        : 'Round $';
        const label = `${labelPrefix}: ${entity}`;
        const value = Number(f.metrics.value ??
            f.metrics.totalSpend ??
            f.metrics.topVendorSpend ??
            f.metrics.recent7dSpend ??
            0);
        return {
            id: f.id,
            label,
            value: Number.isFinite(value) ? Math.max(0, value) : 0,
            color: severityColor(f.severity),
            meta: {
                kind: f.kind,
                analyst: f.analyst,
                severity: f.severity,
            },
        };
    });
    tiles.sort((a, b) => {
        const v = b.value - a.value;
        if (v)
            return v;
        return a.label.localeCompare(b.label);
    });
    return tiles;
}
export function analyzeOps(transactions, range) {
    const txns = transactions
        .filter((t) => t && typeof t.date === 'string' && isWithinRange(t.date, range))
        .slice()
        .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.id.localeCompare(b.id)));
    const findings = [];
    findings.push(...vendorConcentration(txns));
    findings.push(...categorySpike(txns, range));
    findings.push(...duplicateSuspects(txns));
    findings.push(...highFrequencyMerchant(txns));
    findings.push(...roundAmountCluster(txns));
    findings.sort(sortFindingsDeterministic);
    const briefs = buildBriefs(findings);
    const tiles = buildTiles(findings).filter((t) => t.value > 0.01);
    return {
        range,
        generatedAt: new Date().toISOString(),
        findings,
        briefs,
        tiles,
    };
}
//# sourceMappingURL=ops.js.map