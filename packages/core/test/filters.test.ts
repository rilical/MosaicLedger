import { describe, expect, test } from 'vitest';
import type { NormalizedTransaction } from '../src/types';
import { applyTransactionFilters, DEFAULT_FILTERS } from '../src/filters';

function t(partial: Partial<NormalizedTransaction>): NormalizedTransaction {
  return {
    id: 't',
    date: '2026-01-01',
    amount: 10,
    merchantRaw: 'X',
    merchant: 'X',
    category: 'Uncategorized',
    source: 'demo',
    ...partial,
  };
}

describe('applyTransactionFilters', () => {
  test('excludes refunds when configured', () => {
    const txns = [t({ id: 'a', amount: 20 }), t({ id: 'b', amount: -5 })];
    const out = applyTransactionFilters(txns, { ...DEFAULT_FILTERS, excludeRefunds: true });
    expect(out.map((x) => x.id)).toEqual(['a']);
  });

  test('excludes transfers when configured', () => {
    const txns = [t({ id: 'a', category: 'Dining' }), t({ id: 'b', category: 'Transfer' })];
    const out = applyTransactionFilters(txns, { ...DEFAULT_FILTERS, excludeTransfers: true });
    expect(out.map((x) => x.id)).toEqual(['a']);
  });
});
