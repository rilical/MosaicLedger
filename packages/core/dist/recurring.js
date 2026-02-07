import { stableId } from './normalize.js';
function median(nums) {
    const arr = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}
function medianAbsoluteDeviation(nums, med) {
    // MAD: median(|x - median(x)|). Robust vs outliers and small amount jitter.
    const dev = nums.map((n) => Math.abs(n - med));
    return median(dev);
}
function stdev(nums) {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const v = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / nums.length;
    return Math.sqrt(v);
}
function daysBetween(a, b) {
    const da = new Date(a + 'T00:00:00Z');
    const db = new Date(b + 'T00:00:00Z');
    return Math.round((db.getTime() - da.getTime()) / 86400000);
}
function addDays(date, days) {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
export function detectRecurring(transactions) {
    const byMerchant = new Map();
    for (const t of transactions) {
        if (t.amount <= 0)
            continue; // ignore refunds/credits for recurring detection
        const arr = byMerchant.get(t.merchant) ?? [];
        arr.push(t);
        byMerchant.set(t.merchant, arr);
    }
    const out = [];
    for (const [merchant, txns] of byMerchant) {
        if (txns.length < 3)
            continue;
        const sorted = [...txns].sort((a, b) => (a.date < b.date ? -1 : 1));
        const deltas = [];
        for (let i = 1; i < sorted.length; i++) {
            deltas.push(daysBetween(sorted[i - 1].date, sorted[i].date));
        }
        const m = median(deltas);
        let cadence = null;
        let cadenceDays = 0;
        if (Math.abs(m - 30) <= 5) {
            cadence = 'monthly';
            cadenceDays = 30;
        }
        else if (Math.abs(m - 14) <= 3) {
            cadence = 'biweekly';
            cadenceDays = 14;
        }
        else if (Math.abs(m - 7) <= 2) {
            cadence = 'weekly';
            cadenceDays = 7;
        }
        if (!cadence)
            continue;
        const amts = sorted.map((t) => t.amount);
        const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
        // VISA-008: amount jitter tolerance using robust stats (MAD).
        // This helps catch subscriptions with small variance (tax, FX) while still penalizing unstable amounts.
        const amtMed = median(amts);
        const mad = medianAbsoluteDeviation(amts, amtMed);
        const robustCv = amtMed === 0 ? 1 : mad / Math.abs(amtMed);
        // Keep stdev CV as a backstop for pathological shapes (e.g. bimodal amounts).
        const classicCv = mean === 0 ? 1 : stdev(amts) / Math.abs(mean);
        const amountVariance = Math.max(robustCv, classicCv);
        // Hard guardrail: extremely unstable amounts are usually not a true recurring bill/subscription.
        // This keeps false positives low without hurting small-jitter subscriptions.
        if (amountVariance > 0.65)
            continue;
        const cadenceFit = Math.max(0, 1 - Math.min(1, Math.abs(m - cadenceDays) / cadenceDays));
        const amountStability = Math.max(0, 1 - Math.min(1, amountVariance));
        const countScore = Math.min(1, txns.length / 6);
        const confidence = 0.45 * cadenceFit + 0.35 * amountStability + 0.2 * countScore;
        const last = sorted[sorted.length - 1];
        out.push({
            id: stableId(['recurring', merchant]),
            merchant,
            cadence,
            nextDate: addDays(last.date, cadenceDays),
            expectedAmount: amtMed,
            confidence,
        });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
}
//# sourceMappingURL=recurring.js.map