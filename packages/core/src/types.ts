export type NormalizedTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // positive spend
  merchantRaw: string;
  merchant: string; // canonicalized
  category: string;
  source: 'csv' | 'bank' | 'demo' | 'nessie';
  // Optional enrichment: some connectors provide per-account provenance + pending flags.
  accountId?: string;
  pending?: boolean;
};

export type RecurringCharge = {
  id: string;
  merchant: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  nextDate: string;
  expectedAmount: number;
  confidence: number; // 0..1
};

export type Summary = {
  transactions: NormalizedTransaction[];
  byCategory: Record<string, number>;
  byMerchant: Record<string, number>;
  recurring: RecurringCharge[];
  totalSpend: number;
};

export type GoalInput =
  | {
      goalType: 'save_by_date';
      saveAmount: number;
      byDate: string; // YYYY-MM-DD
    }
  | {
      goalType: 'monthly_cap';
      category: string;
      capAmount: number;
    };

export type ActionRecommendation = {
  id: string;
  actionType: 'cancel' | 'cap' | 'substitute';
  title: string;
  target: { kind: 'merchant' | 'category'; value: string };
  expectedMonthlySavings: number;
  effortScore: number; // 0..1 (lower = easier)
  confidence: number; // 0..1
  explanation: string;
  reasons?: string[]; // deterministic bullet points (AI rewrite may be applied separately)
};
