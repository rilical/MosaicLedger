export type NormalizedTransaction = {
    id: string;
    date: string;
    amount: number;
    merchantRaw: string;
    merchant: string;
    category: string;
    source: 'csv' | 'bank' | 'demo' | 'nessie';
    accountId?: string;
    pending?: boolean;
};
export type DateRange = {
    start: string;
    end: string;
};
//# sourceMappingURL=transactions.d.ts.map