function formatMoney(n) {
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    return `${sign}$${abs.toFixed(2)}`;
}
function sumExceptionValue(report) {
    let total = 0;
    for (const ex of report.exceptions) {
        const a = ex.ledgerEntry?.amount ?? ex.txn?.amount ?? 0;
        total += Math.abs(a);
    }
    return total;
}
function severityRank(sev) {
    return sev === 'high' ? 0 : sev === 'med' ? 1 : 2;
}
export function buildOpsMemoDeterministic(report) {
    const byKind = {};
    const bySeverity = { low: 0, med: 0, high: 0 };
    for (const ex of report.exceptions) {
        byKind[ex.kind] = (byKind[ex.kind] ?? 0) + 1;
        bySeverity[ex.severity] = (bySeverity[ex.severity] ?? 0) + 1;
    }
    const exceptionValue = sumExceptionValue(report);
    const topRisks = report.riskFlags
        .slice()
        .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
        .slice(0, 3);
    const bullets = [];
    bullets.push(`Range: ${report.range.start} to ${report.range.end}. Matches: ${report.matches.length}. Exceptions: ${report.exceptions.length} (${formatMoney(exceptionValue)} abs value).`);
    bullets.push(`Exceptions by severity: high=${bySeverity.high ?? 0}, med=${bySeverity.med ?? 0}, low=${bySeverity.low ?? 0}.`);
    bullets.push(`Exceptions by kind: ${Object.entries(byKind)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}.`);
    if (topRisks.length) {
        bullets.push(`Top risks: ${topRisks
            .map((r) => `${r.kind} (${r.severity})`)
            .join(', ')}.`);
    }
    const nextSteps = [];
    nextSteps.push('Review unmatched ledger entries and validate they posted at the bank.');
    nextSteps.push('Review unmatched bank transactions and confirm they belong in the internal ledger.');
    if ((byKind.duplicate_suspect ?? 0) > 0) {
        nextSteps.push('Confirm duplicate suspects: two ledger rows matched the same bank transaction.');
    }
    if ((byKind.amount_mismatch ?? 0) > 0) {
        nextSteps.push('Investigate amount mismatches: validate fees, partial postings, or data entry errors.');
    }
    if ((byKind.date_mismatch ?? 0) > 0) {
        nextSteps.push('Investigate date mismatches: validate posting date vs transaction date.');
    }
    if (report.riskFlags.some((r) => r.kind === 'policy_violation')) {
        nextSteps.push('Escalate policy violations per compliance checklist (config-driven).');
    }
    return {
        title: 'Daily Close Summary',
        bullets,
        nextSteps,
    };
}
//# sourceMappingURL=opsMemo.js.map