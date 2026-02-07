import type {
  ActionRecommendation,
  NormalizedTransaction,
  RecurringCharge,
  Summary,
} from '@mosaicledger/core';
import type { TreemapTile } from '@mosaicledger/mosaic';

export type AnalysisArtifactsV1 = {
  version: 1;
  generatedAt: string; // ISO
  // Evidence + UX only (not yet persisted in Supabase `analysis_runs` to keep schema minimal).
  source?: 'demo' | 'plaid' | 'plaid_fixture' | 'nessie';
  // Optional for now: used for client-side drill-down and evidence UI.
  // We don't persist this in Supabase `analysis_runs` yet to keep schema minimal.
  transactions?: NormalizedTransaction[];
  summary: Pick<Summary, 'totalSpend' | 'byCategory' | 'byMerchant'> & {
    transactionCount: number;
  };
  mosaic: {
    tiles: TreemapTile[];
  };
  recurring: RecurringCharge[];
  actionPlan: ActionRecommendation[];
};
