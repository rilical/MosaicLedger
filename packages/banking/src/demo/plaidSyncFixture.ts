export type PlaidPersonalFinanceCategory = { primary?: string };

export type PlaidLikeTransaction = {
  transaction_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  merchant_name?: string | null;
  amount: number; // Plaid: positive = debit (spend)
  pending?: boolean;
  personal_finance_category?: PlaidPersonalFinanceCategory;
  category?: string[] | null;
};

export type PlaidSyncFixture = {
  added: PlaidLikeTransaction[];
  modified: PlaidLikeTransaction[];
  removed: string[];
};

import fixtureJson from './plaidSyncFixture.json' assert { type: 'json' };

export const PLAID_SYNC_FIXTURE: Readonly<PlaidSyncFixture> =
  fixtureJson as unknown as PlaidSyncFixture;

export function getPlaidSyncFixture(): PlaidSyncFixture {
  // Return a deep-ish copy so callers can't mutate module singleton in dev.
  return {
    added: PLAID_SYNC_FIXTURE.added.map((t) => ({ ...t })),
    modified: PLAID_SYNC_FIXTURE.modified.map((t) => ({ ...t })),
    removed: [...PLAID_SYNC_FIXTURE.removed],
  };
}

export function applyFixtureSyncState(f: PlaidSyncFixture): PlaidLikeTransaction[] {
  const byId = new Map<string, PlaidLikeTransaction>();
  for (const t of f.added) byId.set(t.transaction_id, t);
  for (const t of f.modified) byId.set(t.transaction_id, t);
  for (const id of f.removed) byId.delete(id);

  return Array.from(byId.values()).sort((a, b) => {
    // Newest first, stable by id.
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.transaction_id < b.transaction_id ? -1 : 1;
  });
}
