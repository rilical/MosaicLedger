import type { NormalizedTransaction } from './types.js';

export type TransactionFilters = {
  excludeTransfers: boolean;
  excludeRefunds: boolean;
};

export const DEFAULT_FILTERS: TransactionFilters = {
  excludeTransfers: true,
  excludeRefunds: true,
};

export function isRefund(t: NormalizedTransaction): boolean {
  return t.amount < 0;
}

export function isTransferLike(t: NormalizedTransaction): boolean {
  const cat = t.category.trim().toLowerCase();
  if (cat === 'transfer' || cat === 'transfers') return true;

  // Hackathon heuristic: keep it conservative to avoid excluding real spend.
  const m = t.merchant.toUpperCase();
  const raw = t.merchantRaw.toUpperCase();
  const s = `${m} ${raw}`;
  return (
    s.includes('TRANSFER') ||
    s.includes('ACH') ||
    s.includes('ZELLE') ||
    s.includes('VENMO') ||
    s.includes('CASH APP')
  );
}

export function applyTransactionFilters(
  transactions: NormalizedTransaction[],
  filters: TransactionFilters,
): NormalizedTransaction[] {
  return transactions.filter((t) => {
    if (filters.excludeRefunds && isRefund(t)) return false;
    if (filters.excludeTransfers && isTransferLike(t)) return false;
    return true;
  });
}
