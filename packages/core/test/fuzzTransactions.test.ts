import { describe, expect, test } from 'vitest';
import {
  applyTransactionFilters,
  DEFAULT_FILTERS,
  normalizeRawTransactions,
  summarizeTransactions,
  type RawTransactionInput,
} from '../src';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomDate(rng: () => number): string {
  // Keep within a stable window so date parsing doesn't break on invalid dates.
  const year = 2025 + randomInt(rng, 0, 1);
  const month = randomInt(rng, 1, 12);
  const day = randomInt(rng, 1, 28);
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function genRawTransactions(rng: () => number, count: number): RawTransactionInput[] {
  const merchants = [
    'UBER EATS  *1234',
    '  Starbucks #001  ',
    'AMZN Mktp US*2H3K4L',
    'VENMO CASHOUT',
    'Zelle Transfer',
    'ACME, INC. (NY)',
    'Gas-Station_42',
    'Weird  Merchant\tName',
    'Refund: SOME STORE',
    '',
    '      ',
  ];

  const categories = [
    'Groceries',
    'Transfer',
    'Transfers',
    'Dining',
    'Utilities',
    'Uncategorized',
    '  ',
    '',
  ];

  const amounts: number[] = [
    12.34,
    0,
    -8.5, // refund
    199.99,
    -120.0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  const out: RawTransactionInput[] = [];
  for (let i = 0; i < count; i++) {
    const raw: RawTransactionInput = {
      date: randomDate(rng),
      name: pick(rng, merchants),
      amount: pick(rng, amounts),
      category: pick(rng, categories),
    };
    out.push(raw);
  }
  return out;
}

function assertFiniteSummary(summary: ReturnType<typeof summarizeTransactions>) {
  expect(Number.isFinite(summary.totalSpend)).toBe(true);

  for (const v of Object.values(summary.byCategory)) expect(Number.isFinite(v)).toBe(true);
  for (const v of Object.values(summary.byMerchant)) expect(Number.isFinite(v)).toBe(true);

  // Totals should be consistent with breakdown sums.
  const sumCats = Object.values(summary.byCategory).reduce((a, b) => a + b, 0);
  const sumMerchants = Object.values(summary.byMerchant).reduce((a, b) => a + b, 0);
  expect(Math.abs(sumCats - summary.totalSpend)).toBeLessThan(1e-9);
  expect(Math.abs(sumMerchants - summary.totalSpend)).toBeLessThan(1e-9);
}

describe('QA-016: transaction fuzz / edge cases', () => {
  test('normalization + summarize never produce NaN/Infinity across random edge cases', () => {
    const rng = mulberry32(0xdecafbad);

    // Multiple runs to cover more combinations while keeping CI fast.
    for (let run = 0; run < 60; run++) {
      const raw = genRawTransactions(rng, randomInt(rng, 0, 240));

      const normalizedAll = normalizeRawTransactions(raw, { source: 'demo', spendOnly: false });
      for (const t of normalizedAll) {
        expect(t.id).toBeTruthy();
        expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof t.merchantRaw).toBe('string');
        expect(typeof t.merchant).toBe('string');
        expect(t.merchant.length).toBeGreaterThan(0);
        expect(Number.isFinite(t.amount)).toBe(true);
      }

      const normalizedSpendOnly = normalizeRawTransactions(raw, {
        source: 'demo',
        spendOnly: true,
      });
      for (const t of normalizedSpendOnly) {
        expect(Number.isFinite(t.amount)).toBe(true);
        expect(t.amount).toBeGreaterThan(0);
      }

      const f1 = applyTransactionFilters(normalizedAll, { ...DEFAULT_FILTERS });
      const f2 = applyTransactionFilters(normalizedAll, {
        excludeRefunds: false,
        excludeTransfers: true,
      });
      const f3 = applyTransactionFilters(normalizedAll, {
        excludeRefunds: true,
        excludeTransfers: false,
      });
      const f4 = applyTransactionFilters(normalizedAll, {
        excludeRefunds: false,
        excludeTransfers: false,
      });

      assertFiniteSummary(summarizeTransactions(f1));
      assertFiniteSummary(summarizeTransactions(f2));
      assertFiniteSummary(summarizeTransactions(f3));
      assertFiniteSummary(summarizeTransactions(f4));
    }
  });

  test('empty input stays stable', () => {
    const normalized = normalizeRawTransactions([], { source: 'demo', spendOnly: false });
    expect(normalized).toEqual([]);
    const summary = summarizeTransactions(normalized);
    assertFiniteSummary(summary);
    expect(summary.totalSpend).toBe(0);
  });
});
