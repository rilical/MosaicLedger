export type PlaidPersonalFinanceCategory = {
    primary?: string;
};
export type PlaidLikeTransaction = {
    transaction_id: string;
    date: string;
    name: string;
    merchant_name?: string | null;
    amount: number;
    pending?: boolean;
    personal_finance_category?: PlaidPersonalFinanceCategory;
    category?: string[] | null;
};
export type PlaidSyncFixture = {
    added: PlaidLikeTransaction[];
    modified: PlaidLikeTransaction[];
    removed: string[];
};
export declare const PLAID_SYNC_FIXTURE: Readonly<PlaidSyncFixture>;
export declare function getPlaidSyncFixture(): PlaidSyncFixture;
export declare function applyFixtureSyncState(f: PlaidSyncFixture): PlaidLikeTransaction[];
//# sourceMappingURL=plaidSyncFixture.d.ts.map