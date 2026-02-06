import type { NormalizedTransaction, Summary } from './types';
import { detectRecurring } from './recurring';

export function summarizeTransactions(transactions: NormalizedTransaction[]): Summary {
  const byCategory: Record<string, number> = {};
  const byMerchant: Record<string, number> = {};

  let totalSpend = 0;
  for (const t of transactions) {
    totalSpend += t.amount;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    byMerchant[t.merchant] = (byMerchant[t.merchant] ?? 0) + t.amount;
  }

  const recurring = detectRecurring(transactions).filter((r) => r.confidence >= 0.55);

  return {
    transactions,
    byCategory,
    byMerchant,
    recurring,
    totalSpend,
  };
}
