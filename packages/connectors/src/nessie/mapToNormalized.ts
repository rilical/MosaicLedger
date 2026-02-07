import { normalizeMerchantName, stableId, type NormalizedTransaction } from '@mosaicledger/core';
import type { NessiePurchase } from './types';

export type NessieMapOptions = {
  /**
   * Source tag to stamp onto NormalizedTransaction.source.
   * This repo's engine treats Nessie as a bank-like source by default.
   */
  source?: NormalizedTransaction['source'];
  /** Default category if Nessie doesn't provide one. */
  defaultCategory?: string;
};

export function nessiePurchaseToNormalized(
  p: NessiePurchase,
  opts: NessieMapOptions = {},
): NormalizedTransaction | null {
  const date = (p.purchase_date ?? '').trim();
  const merchantRaw = (p.description ?? '').trim();
  const amount = Number(p.amount);

  if (!date || !merchantRaw || !Number.isFinite(amount)) return null;

  const category = (p.type ?? '').trim() || opts.defaultCategory || 'Uncategorized';
  const source: NormalizedTransaction['source'] = opts.source ?? 'bank';

  const merchant = normalizeMerchantName(merchantRaw);

  return {
    id: stableId(['nessie', p._id ?? '', date, merchantRaw, String(amount)]),
    date,
    amount,
    merchantRaw,
    merchant,
    category,
    source,
  };
}

export function mapNessiePurchasesToNormalized(
  purchases: NessiePurchase[],
  opts: NessieMapOptions = {},
): NormalizedTransaction[] {
  const out: NormalizedTransaction[] = [];
  for (const p of purchases) {
    const t = nessiePurchaseToNormalized(p, opts);
    if (t) out.push(t);
  }
  return out;
}
