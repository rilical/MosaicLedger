import { type NormalizedTransaction } from '@mosaicledger/core';
import type { NessiePurchase } from './types';
export type NessieMapOptions = {
    /**
     * Source tag to stamp onto NormalizedTransaction.source.
     * This repo's engine treats Nessie as a bank-like source by default.
     */
    source?: NormalizedTransaction['source'];
    /** Account id to stamp onto each mapped transaction (recommended). */
    accountId?: string;
    /** Default category if Nessie doesn't provide one. */
    defaultCategory?: string;
};
export declare function nessiePurchaseToNormalized(p: NessiePurchase, opts?: NessieMapOptions): NormalizedTransaction | null;
export declare function mapNessiePurchasesToNormalized(purchases: NessiePurchase[], opts?: NessieMapOptions): NormalizedTransaction[];
//# sourceMappingURL=mapToNormalized.d.ts.map