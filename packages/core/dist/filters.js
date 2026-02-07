export const DEFAULT_FILTERS = {
    excludeTransfers: true,
    excludeRefunds: true,
};
export function isRefund(t) {
    return t.amount < 0;
}
export function isTransferLike(t) {
    const cat = t.category.trim().toLowerCase();
    if (cat === 'transfer' || cat === 'transfers')
        return true;
    // Hackathon heuristic: keep it conservative to avoid excluding real spend.
    const m = t.merchant.toUpperCase();
    const raw = t.merchantRaw.toUpperCase();
    const s = `${m} ${raw}`;
    return (s.includes('TRANSFER') ||
        s.includes('ACH') ||
        s.includes('ZELLE') ||
        s.includes('VENMO') ||
        s.includes('CASH APP'));
}
export function applyTransactionFilters(transactions, filters) {
    return transactions.filter((t) => {
        if (filters.excludeRefunds && isRefund(t))
            return false;
        if (filters.excludeTransfers && isTransferLike(t))
            return false;
        return true;
    });
}
//# sourceMappingURL=filters.js.map