import { getDemoTransactions } from '@mosaicledger/banking';
import {
  normalizeRawTransactions,
  recommendActions,
  summarizeTransactions,
} from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import type { AnalysisArtifactsV1 } from './types';

export function computeDemoArtifacts(): AnalysisArtifactsV1 {
  const raw = getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });
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
