import { describe, expect, test } from 'vitest';
import { analyzeOps } from '../src/ops';
import type { NormalizedTransaction } from '@mosaicledger/contracts';

function demoTxns(): NormalizedTransaction[] {
  return [
    {
      id: 't1',
      date: '2026-01-10',
      amount: 12.5,
      merchantRaw: 'STARBUCKS',
      merchant: 'Starbucks',
      category: 'Food',
      source: 'demo',
    },
    {
      id: 't2',
      date: '2026-01-10',
      amount: 12.5,
      merchantRaw: 'STARBUCKS',
      merchant: 'Starbucks',
      category: 'Food',
      source: 'demo',
    },
    {
      id: 't3',
      date: '2026-01-11',
      amount: 200,
      merchantRaw: 'ACME',
      merchant: 'Acme',
      category: 'Services',
      source: 'demo',
    },
    {
      id: 't4',
      date: '2026-01-15',
      amount: 100,
      merchantRaw: 'UBER',
      merchant: 'Uber',
      category: 'Transport',
      source: 'demo',
    },
    {
      id: 't5',
      date: '2026-01-16',
      amount: 100,
      merchantRaw: 'UBER',
      merchant: 'Uber',
      category: 'Transport',
      source: 'demo',
    },
  ];
}

describe('analyzeOps', () => {
  test('is deterministic for stable inputs', () => {
    const txns = demoTxns();
    const range = { start: '2026-01-01', end: '2026-01-31' };
    const a = analyzeOps(txns, range);
    const b = analyzeOps(txns, range);
    // `generatedAt` is intentionally time-based; everything else must be stable.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { generatedAt: _ga, ...aRest } = a;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { generatedAt: _gb, ...bRest } = b;
    expect(aRest).toEqual(bRest);
  });

  test('produces tiles and briefs for findings', () => {
    const txns = demoTxns();
    const range = { start: '2026-01-01', end: '2026-01-31' };
    const out = analyzeOps(txns, range);
    expect(out.findings.length).toBeGreaterThan(0);
    expect(out.briefs.length).toBeGreaterThan(0);
    expect(out.tiles.length).toBeGreaterThan(0);
  });
});
