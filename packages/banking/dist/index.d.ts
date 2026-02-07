export type BankProvider = {
    name: string;
    createLinkToken(params: {
        userId: string;
    }): Promise<{
        linkToken: string;
    }>;
    exchangePublicToken(params: {
        publicToken: string;
    }): Promise<{
        accessToken: string;
    }>;
    fetchTransactions(params: {
        accessToken: string;
        startDate: string;
        endDate: string;
    }): Promise<Array<{
        date: string;
        name: string;
        amount: number;
        category?: string;
    }>>;
};
export * from './demo/index.js';
export declare function createPlaidProvider(_env: {
    PLAID_CLIENT_ID?: string;
    PLAID_SECRET?: string;
    PLAID_ENV?: 'sandbox' | 'development' | 'production';
}): BankProvider;
//# sourceMappingURL=index.d.ts.map