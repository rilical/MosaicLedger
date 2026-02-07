export type DemoRawTransaction = {
    date: string;
    name: string;
    amount: number;
    category?: string;
};
export declare const DEMO_DATASET: ReadonlyArray<DemoRawTransaction>;
export declare function getDemoTransactions(): DemoRawTransaction[];
export * from './plaidSyncFixture.js';
//# sourceMappingURL=index.d.ts.map