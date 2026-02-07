import { normalizeMerchantName, stableId } from './normalize.js';
export function normalizeRawTransactions(raw, opts) {
    const spendOnly = opts?.spendOnly ?? true;
    const source = opts?.source ?? 'bank';
    const out = [];
    for (const r of raw) {
        const date = (r.date ?? '').trim();
        const merchantRaw = (r.name ?? '').trim();
        const amount = Number(r.amount);
        const category = (r.category ?? '').trim();
        if (!date || !merchantRaw || !Number.isFinite(amount))
            continue;
        if (spendOnly && amount <= 0)
            continue;
        const merchant = normalizeMerchantName(merchantRaw);
        out.push({
            id: stableId([date, merchantRaw, String(amount)]),
            date,
            amount,
            merchantRaw,
            merchant,
            category: category || 'Uncategorized',
            source,
        });
    }
    return out;
}
//# sourceMappingURL=raw.js.map