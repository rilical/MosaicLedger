import { normalizeMerchantName, stableId } from '@mosaicledger/core';
export function nessiePurchaseToNormalized(p, opts = {}) {
    const date = (p.purchase_date ?? '').trim();
    const merchantRaw = (p.description ?? p.merchant_id ?? '').trim();
    const amount = Number(p.amount);
    if (!date || !merchantRaw || !Number.isFinite(amount))
        return null;
    const category = (p.type ?? '').trim() || opts.defaultCategory || 'Uncategorized';
    const source = opts.source ?? 'nessie';
    const merchant = normalizeMerchantName(merchantRaw);
    return {
        id: (p._id ?? '').trim() || stableId(['nessie', date, merchantRaw, String(amount)]),
        date,
        amount,
        merchantRaw,
        merchant,
        category,
        source,
        accountId: opts.accountId,
        pending: false,
    };
}
export function mapNessiePurchasesToNormalized(purchases, opts = {}) {
    const out = [];
    for (const p of purchases) {
        const t = nessiePurchaseToNormalized(p, opts);
        if (t)
            out.push(t);
    }
    return out;
}
//# sourceMappingURL=mapToNormalized.js.map