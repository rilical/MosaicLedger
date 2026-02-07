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
export type RecurringCharge = {
    id: string;
    merchant: string;
    cadence: 'weekly' | 'biweekly' | 'monthly';
    nextDate: string;
    expectedAmount: number;
    confidence: number;
};
export type Summary = {
    transactions: NormalizedTransaction[];
    byCategory: Record<string, number>;
    byMerchant: Record<string, number>;
    recurring: RecurringCharge[];
    totalSpend: number;
};
export type GoalInput = {
    goalType: 'save_by_date';
    saveAmount: number;
    byDate: string;
} | {
    goalType: 'monthly_cap';
    category: string;
    capAmount: number;
};
export type ActionRecommendation = {
    id: string;
    actionType: 'cancel' | 'cap' | 'substitute';
    title: string;
    target: {
        kind: 'merchant' | 'category';
        value: string;
    };
    expectedMonthlySavings: number;
    effortScore: number;
    confidence: number;
    explanation: string;
    reasons?: string[];
};
//# sourceMappingURL=types.d.ts.map