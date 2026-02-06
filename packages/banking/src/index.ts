export type BankProvider = {
  name: string;
  createLinkToken(params: { userId: string }): Promise<{ linkToken: string }>;
  exchangePublicToken(params: { publicToken: string }): Promise<{ accessToken: string }>;
  fetchTransactions(params: {
    accessToken: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }): Promise<
    Array<{
      date: string;
      name: string;
      amount: number;
      category?: string;
    }>
  >;
};

export * from './demo';

// Scaffold: Plaid-first shape. Actual implementation is deferred until keys/compliance decisions are set.
export function createPlaidProvider(_env: {
  PLAID_CLIENT_ID?: string;
  PLAID_SECRET?: string;
  PLAID_ENV?: 'sandbox' | 'development' | 'production';
}): BankProvider {
  return {
    name: 'plaid',
    async createLinkToken() {
      throw new Error('Plaid provider not wired yet (missing implementation)');
    },
    async exchangePublicToken() {
      throw new Error('Plaid provider not wired yet (missing implementation)');
    },
    async fetchTransactions() {
      throw new Error('Plaid provider not wired yet (missing implementation)');
    },
  };
}
