import { describe, expect, it } from 'vitest';

import { getDemoTransactions } from '@mosaicledger/banking';
import { normalizeRawTransactions } from '@mosaicledger/core';

import { analyzeTransactionsTool, buildActionPlanTool, buildMosaicSpecTool } from '../src/tools';

describe('mcp-server tools (DED-003)', () => {
  it('analyzeTransactions returns a valid summary for demo txns', () => {
    const raw = getDemoTransactions();
    const txns = normalizeRawTransactions(raw, { source: 'demo' });
    const out = analyzeTransactionsTool({ version: 'v1', transactions: txns });
    expect(out.version).toBe('v1');
    expect(out.summary.transactions.length).toBeGreaterThan(0);
    expect(Number.isFinite(out.summary.totalSpend)).toBe(true);
  });

  it('buildMosaicSpec tiles are bounded and deterministic-ish', () => {
    const raw = getDemoTransactions();
    const txns = normalizeRawTransactions(raw, { source: 'demo' });
    const summary = analyzeTransactionsTool({ version: 'v1', transactions: txns }).summary;

    const out = buildMosaicSpecTool({ version: 'v1', byCategory: summary.byCategory });
    expect(out.version).toBe('v1');
    expect(out.tiles.length).toBeGreaterThan(0);
    for (const t of out.tiles) {
      expect(t.w).toBeGreaterThanOrEqual(0);
      expect(t.h).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(t.x)).toBe(true);
      expect(Number.isFinite(t.y)).toBe(true);
    }
  });

  it('buildActionPlan returns stable-shaped actions', () => {
    const raw = getDemoTransactions();
    const txns = normalizeRawTransactions(raw, { source: 'demo' });
    const summary = analyzeTransactionsTool({ version: 'v1', transactions: txns }).summary;

    const out = buildActionPlanTool({
      version: 'v1',
      summary,
      goal: { goalType: 'monthly_cap', category: 'Dining', capAmount: 200 },
    });
    expect(out.version).toBe('v1');
    expect(Array.isArray(out.actions)).toBe(true);
    for (const a of out.actions) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.title).toBe('string');
      expect(Number.isFinite(a.expectedMonthlySavings)).toBe(true);
    }
  });
});

