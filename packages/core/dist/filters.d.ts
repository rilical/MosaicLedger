import type { NormalizedTransaction } from './types.js';
export type TransactionFilters = {
    excludeTransfers: boolean;
    excludeRefunds: boolean;
};
export declare const DEFAULT_FILTERS: TransactionFilters;
export declare function isRefund(t: NormalizedTransaction): boolean;
export declare function isTransferLike(t: NormalizedTransaction): boolean;
export declare function applyTransactionFilters(transactions: NormalizedTransaction[], filters: TransactionFilters): NormalizedTransaction[];
//# sourceMappingURL=filters.d.ts.map