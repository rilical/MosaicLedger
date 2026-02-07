import { describe, expect, test } from 'vitest';
import { detectRecurring } from '../src/recurring';
import type { NormalizedTransaction } from '../src/types';

function t(partial: Partial<NormalizedTransaction>): NormalizedTransaction {
  return {
    id: partial.id ?? 't',
    date: partial.date ?? '2026-01-01',
    amount: partial.amount ?? 10,
    merchantRaw: partial.merchantRaw ?? 'X',
    merchant: partial.merchant ?? 'X',
    category: partial.category ?? 'Uncategorized',
    source: partial.source ?? 'demo',
  };
}

describe('VISA-008: recurring detection amount jitter', () => {
  test('detects a monthly subscription with small amount jitter', () => {
    const txns: NormalizedTransaction[] = [
      t({ id: 'a', merchant: 'NETFLIX', date: '2025-10-01', amount: 15.49 }),
      t({ id: 'b', merchant: 'NETFLIX', date: '2025-11-01', amount: 15.99 }),
      t({ id: 'c', merchant: 'NETFLIX', date: '2025-12-01', amount: 15.49 }),
      t({ id: 'd', merchant: 'NETFLIX', date: '2026-01-01', amount: 15.79 }),
    ];

    const out = detectRecurring(txns);
    const r = out.find((x) => x.merchant === 'NETFLIX');
    expect(r).toBeTruthy();
    expect(r?.cadence).toBe('monthly');
    expect(r?.confidence ?? 0).toBeGreaterThanOrEqual(0.55);
  });

  test('avoids false positives when amounts are unstable', () => {
    const txns: NormalizedTransaction[] = [
      t({ id: 'a', merchant: 'WEIRD', date: '2025-10-01', amount: 9.99 }),
      t({ id: 'b', merchant: 'WEIRD', date: '2025-11-01', amount: 49.99 }),
      t({ id: 'c', merchant: 'WEIRD', date: '2025-12-01', amount: 12.99 }),
      t({ id: 'd', merchant: 'WEIRD', date: '2026-01-01', amount: 79.99 }),
    ];

    const out = detectRecurring(txns);
    const r = out.find((x) => x.merchant === 'WEIRD');
    expect(r).toBeUndefined();
  });
});
