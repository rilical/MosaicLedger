import type { LedgerEntry, OpsReport } from '@mosaicledger/core';
import type { NormalizedTransaction } from '@mosaicledger/core';
export declare function buildOpsReport(params: {
    range: {
        start: string;
        end: string;
    };
    ledgerEntries: LedgerEntry[];
    txns: NormalizedTransaction[];
}): OpsReport;
//# sourceMappingURL=report.d.ts.map