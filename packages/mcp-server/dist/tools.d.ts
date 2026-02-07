import type { ActionRecommendation, Summary } from '@mosaicledger/core';
import type { TreemapTile } from '@mosaicledger/mosaic';
import { SCHEMA_VERSION } from './schemas.js';
export declare function analyzeTransactionsTool(input: unknown): {
    version: typeof SCHEMA_VERSION;
    summary: Summary;
};
export declare function buildMosaicSpecTool(input: unknown): {
    version: typeof SCHEMA_VERSION;
    tiles: TreemapTile[];
};
export declare function buildActionPlanTool(input: unknown): {
    version: typeof SCHEMA_VERSION;
    actions: ActionRecommendation[];
};
//# sourceMappingURL=tools.d.ts.map