export type NormalizedTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // positive spend (refunds may be negative depending on source)
  merchantRaw: string;
  merchant: string; // canonical merchant label
  category: string;
  source: 'csv' | 'bank' | 'demo' | 'nessie';
  accountId?: string;
  pending?: boolean;
};

export type DateRange = { start: string; end: string };
