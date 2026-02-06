import { getDemoTransactions } from '@mosaicledger/banking';
import {
  applyTransactionFilters,
  DEFAULT_FILTERS,
  endOfMonth,
  isWithinRange,
  monthStart,
  normalizeRawTransactions,
  recommendActions,
  summarizeTransactions,
} from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import type { AnalysisArtifactsV1 } from './types';

export type AnalyzePreset = 'this_month' | 'last_month' | 'custom';

export type AnalyzeRequestV1 = {
  preset?: AnalyzePreset;
  customRange?: { start: string; end: string };
  filters?: {
    excludeTransfers?: boolean;
    excludeRefunds?: boolean;
  };
};

function latestDate(dates: string[]): string | null {
  let max: string | null = null;
  for (const d of dates) {
    if (!max || d > max) max = d;
  }
  return max;
}

function monthShift(yyyyMmDd: string, deltaMonths: number): string {
  const d = new Date(yyyyMmDd + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + deltaMonths);
  return d.toISOString().slice(0, 10);
}

function resolveRange(
  txns: Array<{ date: string }>,
  req: AnalyzeRequestV1,
): { start: string; end: string } {
  const preset = req.preset ?? 'this_month';

  if (preset === 'custom' && req.customRange?.start && req.customRange?.end) {
    return { start: req.customRange.start, end: req.customRange.end };
  }

  // Demo-friendly default: interpret "this month" relative to latest available data,
  // not the wall clock, so the mosaic doesn't render empty.
  const max = latestDate(txns.map((t) => t.date));
  const ref = max ?? new Date().toISOString().slice(0, 10);
  const base = preset === 'last_month' ? monthShift(ref, -1) : ref;
  const start = monthStart(base);
  const end = endOfMonth(base);
  return { start, end };
}

export function computeDemoArtifacts(req: AnalyzeRequestV1 = {}): AnalysisArtifactsV1 {
  const raw = getDemoTransactions();
  const txnsAll = normalizeRawTransactions(raw, { source: 'demo', spendOnly: false });

  const filters = {
    ...DEFAULT_FILTERS,
    ...req.filters,
  };

  const range = resolveRange(txnsAll, req);

  const txns = applyTransactionFilters(txnsAll, filters).filter((t) =>
    isWithinRange(t.date, range),
  );
  const summary = summarizeTransactions(txns);
  const tiles = buildTreemapTiles(summary.byCategory);
  const actions = recommendActions(summary, {
    goalType: 'save_by_date',
    saveAmount: 200,
    byDate: '2026-04-01',
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      transactionCount: txns.length,
      totalSpend: summary.totalSpend,
      byCategory: summary.byCategory,
      byMerchant: summary.byMerchant,
    },
    mosaic: { tiles },
    recurring: summary.recurring,
    actionPlan: actions,
  };
}
