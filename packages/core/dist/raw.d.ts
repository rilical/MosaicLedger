import type { NormalizedTransaction } from './types.js';
export type RawTransactionInput = {
    date: string;
    name: string;
    amount: number;
    category?: string;
};
export declare function normalizeRawTransactions(raw: RawTransactionInput[], opts?: {
    source?: NormalizedTransaction['source'];
    spendOnly?: boolean;
}): NormalizedTransaction[];
//# sourceMappingURL=raw.d.ts.map