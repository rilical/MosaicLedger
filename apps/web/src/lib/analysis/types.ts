import type { ActionRecommendation, RecurringCharge, Summary } from '@mosaicledger/core';
import type { TreemapTile } from '@mosaicledger/mosaic';

export type AnalysisArtifactsV1 = {
  version: 1;
  generatedAt: string; // ISO
  summary: Pick<Summary, 'totalSpend' | 'byCategory' | 'byMerchant'> & {
    transactionCount: number;
  };
  mosaic: {
    tiles: TreemapTile[];
  };
  recurring: RecurringCharge[];
  actionPlan: ActionRecommendation[];
};
