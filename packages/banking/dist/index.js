export * from './demo/index.js';
// Scaffold: Plaid-first shape. Actual implementation is deferred until keys/compliance decisions are set.
export function createPlaidProvider(_env) {
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
//# sourceMappingURL=index.js.map