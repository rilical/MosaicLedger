import { recommendActions, summarizeTransactions } from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import { AnalyzeTransactionsInputSchema, AnalyzeTransactionsOutputSchema, BuildActionPlanInputSchema, BuildActionPlanOutputSchema, BuildMosaicSpecInputSchema, BuildMosaicSpecOutputSchema, SCHEMA_VERSION, } from './schemas.js';
export function analyzeTransactionsTool(input) {
    const parsed = AnalyzeTransactionsInputSchema.parse(input);
    const txns = parsed.transactions;
    const summary = summarizeTransactions(txns);
    return AnalyzeTransactionsOutputSchema.parse({
        version: SCHEMA_VERSION,
        summary,
    });
}
export function buildMosaicSpecTool(input) {
    const parsed = BuildMosaicSpecInputSchema.parse(input);
    const tiles = buildTreemapTiles(parsed.byCategory);
    return BuildMosaicSpecOutputSchema.parse({
        version: SCHEMA_VERSION,
        tiles,
    });
}
export function buildActionPlanTool(input) {
    const parsed = BuildActionPlanInputSchema.parse(input);
    const actions = recommendActions(parsed.summary, parsed.goal);
    return BuildActionPlanOutputSchema.parse({
        version: SCHEMA_VERSION,
        actions,
    });
}
//# sourceMappingURL=tools.js.map