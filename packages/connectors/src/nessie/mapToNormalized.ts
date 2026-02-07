import { normalizeMerchantName, stableId, type NormalizedTransaction } from '@mosaicledger/core';
import type { NessiePurchase } from './types';

export type NessieMapOptions = {
  /**
   * Source tag to stamp onto NormalizedTransaction.source.
   * This repo's engine treats Nessie as a bank-like source by default.
   */
  source?: NormalizedTransaction['source'];
  /** Account id to stamp onto each mapped transaction (recommended). */
  accountId?: string;
  /** Default category if Nessie doesn't provide one. */
  defaultCategory?: string;
};

export function nessiePurchaseToNormalized(
  p: NessiePurchase,
  opts: NessieMapOptions = {},
): NormalizedTransaction | null {
  const date = (p.purchase_date ?? '').trim();
  const merchantRaw = (p.description ?? p.merchant_id ?? '').trim();
  const amount = Number(p.amount);

  if (!date || !merchantRaw || !Number.isFinite(amount)) return null;

  const category = (p.type ?? '').trim() || opts.defaultCategory || 'Uncategorized';
  const source: NormalizedTransaction['source'] = opts.source ?? 'nessie';

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
