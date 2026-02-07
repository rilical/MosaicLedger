import type { LedgerEntry, NormalizedTransaction, OpsRiskFlag } from '@mosaicledger/core';
export type OpsRiskConfig = {
    vendorConcentration: {
        medShare: number;
        highShare: number;
    };
    velocitySpike: {
        kStd: number;
        minRatio: number;
        lookbackWeeks: number;
    };
    unusualAmount: {
        percentile: number;
        multiplier: number;
    };
    roundAmountsCluster: {
        minCount: number;
        minShare: number;
    };
    rapidRefunds: {
        windowDays: number;
        minCount: number;
    };
    policyViolation: {
        blockedCategories: string[];
    };
};
export declare const DEFAULT_OPS_RISK_CONFIG: OpsRiskConfig;
export declare function computeOpsRiskFlags(ledgerEntries: LedgerEntry[], txns: NormalizedTransaction[], _recon: {
    matches: unknown[];
    exceptions: unknown[];
}, config?: Partial<OpsRiskConfig>): OpsRiskFlag[];
//# sourceMappingURL=risk.d.ts.map