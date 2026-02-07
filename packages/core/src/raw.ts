import { normalizeMerchantName, stableId } from './normalize.js';
import type { NormalizedTransaction } from './types.js';

export type RawTransactionInput = {
  date: string; // YYYY-MM-DD
  name: string; // merchant
  amount: number; // positive spend (refunds ignored for MVP)
  category?: string;
};

export function normalizeRawTransactions(
  raw: RawTransactionInput[],
  opts?: { source?: NormalizedTransaction['source']; spendOnly?: boolean },
): NormalizedTransaction[] {
  const spendOnly = opts?.spendOnly ?? true;
  const source = opts?.source ?? 'bank';

  const out: NormalizedTransaction[] = [];

  for (const r of raw) {
    const date = (r.date ?? '').trim();
    const merchantRaw = (r.name ?? '').trim();
    const amount = Number(r.amount);
    const category = (r.category ?? '').trim();

    if (!date || !merchantRaw || !Number.isFinite(amount)) continue;
    if (spendOnly && amount <= 0) continue;

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
