import { buildTreemapTiles } from '@mosaicledger/mosaic';
import { buildOpsMemoDeterministic } from './opsMemo';
import { reconcileLedgerToBank } from './reconcile';
import { computeOpsRiskFlags } from './risk';
const SEVERITY_COLOR = {
    // Keep consistent with the existing Mosaic palette (packages/mosaic/src/colors.ts).
    high: '#f43f5e',
    med: '#eab308',
    low: '#38bdf8',
};
function severityRank(s) {
    return s === 'high' ? 3 : s === 'med' ? 2 : 1;
}
function buildExceptionMosaic(exceptions) {
    const sums = new Map();
    const sev = new Map();
    for (const ex of exceptions) {
        const label = ex.ledgerEntry?.vendorCanonical || ex.kind;
        const amount = ex.ledgerEntry?.amount ?? ex.txn?.amount ?? 0;
        sums.set(label, (sums.get(label) ?? 0) + Math.abs(amount));
        const prev = sev.get(label);
        if (!prev || severityRank(ex.severity) > severityRank(prev)) {
            sev.set(label, ex.severity);
        }
    }
    const entries = Array.from(sums.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const byLabel = {};
    for (const [k, v] of entries)
        byLabel[k] = v;
    const tiles = buildTreemapTiles(byLabel).map((t) => ({
        ...t,
        color: SEVERITY_COLOR[sev.get(t.label) ?? 'low'],
    }));
    return { version: 'v1', tiles };
}
export function buildOpsReport(params) {
    const recon = reconcileLedgerToBank(params.ledgerEntries, params.txns);
    const riskFlags = computeOpsRiskFlags(params.ledgerEntries, params.txns, recon);
    const exceptionMosaic = buildExceptionMosaic(recon.exceptions);
    const report = {
        range: params.range,
        matches: recon.matches,
        exceptions: recon.exceptions,
        riskFlags,
        exceptionMosaic,
        opsMemoDeterministic: {
            title: 'Daily Close Summary',
            bullets: [],
            nextSteps: [],
        },
    };
    report.opsMemoDeterministic = buildOpsMemoDeterministic(report);
    return report;
}
//# sourceMappingURL=report.js.map