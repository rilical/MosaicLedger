import type { LedgerEntry, NormalizedTransaction, ReconException, ReconMatch } from '@mosaicledger/core';
export type ReconcileConfig = {
    amountTolerance: number;
    amountBand: number;
    dateWindowDays: number;
    scoreThreshold: number;
    duplicateThreshold: number;
    weights: {
        amount: number;
        date: number;
        vendor: number;
    };
};
export declare const DEFAULT_RECONCILE_CONFIG: ReconcileConfig;
export declare function reconcileLedgerToBank(ledgerEntries: LedgerEntry[], txns: NormalizedTransaction[], config?: Partial<ReconcileConfig>): {
    matches: ReconMatch[];
    exceptions: ReconException[];
};
//# sourceMappingURL=reconcile.d.ts.map