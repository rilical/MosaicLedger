import { recommendActions, summarizeTransactions } from '@mosaicledger/core';
import type { ActionRecommendation, GoalInput, NormalizedTransaction, Summary } from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import type { TreemapTile } from '@mosaicledger/mosaic';

import {
  AnalyzeTransactionsInputSchema,
  AnalyzeTransactionsOutputSchema,
  BuildActionPlanInputSchema,
  BuildActionPlanOutputSchema,
  BuildMosaicSpecInputSchema,
  BuildMosaicSpecOutputSchema,
  SCHEMA_VERSION,
} from './schemas';

export function analyzeTransactionsTool(input: unknown): { version: typeof SCHEMA_VERSION; summary: Summary } {
  const parsed = AnalyzeTransactionsInputSchema.parse(input);
  const txns: NormalizedTransaction[] = parsed.transactions;
  const summary = summarizeTransactions(txns);

  return AnalyzeTransactionsOutputSchema.parse({
    version: SCHEMA_VERSION,
    summary,
  });
}

export function buildMosaicSpecTool(input: unknown): { version: typeof SCHEMA_VERSION; tiles: TreemapTile[] } {
  const parsed = BuildMosaicSpecInputSchema.parse(input);
  const tiles = buildTreemapTiles(parsed.byCategory);

  return BuildMosaicSpecOutputSchema.parse({
    version: SCHEMA_VERSION,
    tiles,
  });
}

export function buildActionPlanTool(input: unknown): {
  version: typeof SCHEMA_VERSION;
  actions: ActionRecommendation[];
} {
  const parsed = BuildActionPlanInputSchema.parse(input);
  const actions = recommendActions(parsed.summary, parsed.goal as GoalInput);

  return BuildActionPlanOutputSchema.parse({
    version: SCHEMA_VERSION,
    actions,
  });
}

