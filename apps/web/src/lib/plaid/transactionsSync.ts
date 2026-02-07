import 'server-only';

import type { PlaidApi } from 'plaid';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PlaidSyncSummary = {
  ok: true;
  nextCursor: string;
  added: number;
  modified: number;
  removed: number;
};

type PlaidTxn = {
  transaction_id: string;
  date: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  pending?: boolean;
  personal_finance_category?: { primary?: string | null } | null;
  category?: string[] | null;
};

type Removed = { transaction_id: string };

function mapCategory(t: PlaidTxn): string | undefined {
  const pfc = t.personal_finance_category?.primary;
  if (pfc) return pfc;
  const legacy = t.category?.[0];
  return legacy ?? undefined;
}

export async function plaidTransactionsSyncAll(params: {
  plaid: PlaidApi;
  accessToken: string;
  cursor: string | null;
}): Promise<{
  nextCursor: string;
  added: PlaidTxn[];
  modified: PlaidTxn[];
  removed: Removed[];
}> {
  let cursor = params.cursor ?? null;
  const added: PlaidTxn[] = [];
  const modified: PlaidTxn[] = [];
  const removed: Removed[] = [];

  // Pull until has_more is false.
  for (let i = 0; i < 50; i++) {
    const resp = await params.plaid.transactionsSync({
      access_token: params.accessToken,
      cursor: cursor ?? undefined,
      count: 500,
    });

    const data = resp.data as unknown as {
      added: PlaidTxn[];
      modified: PlaidTxn[];
      removed: Removed[];
      next_cursor: string;
      has_more: boolean;
    };

    added.push(...(data.added ?? []));
    modified.push(...(data.modified ?? []));
    removed.push(...(data.removed ?? []));

    cursor = data.next_cursor;
    if (!data.has_more) break;
  }

  if (!cursor) {
    throw new Error('Plaid sync returned empty cursor');
  }

  return { nextCursor: cursor, added, modified, removed };
}

export async function upsertPlaidSyncToDb(params: {
  supabase: SupabaseClient;
  userId: string;
  itemId: string | null;
  sync: { added: PlaidTxn[]; modified: PlaidTxn[]; removed: Removed[] };
}): Promise<void> {
  const now = new Date().toISOString();

  const upserts = [...params.sync.added, ...params.sync.modified].map((t) => ({
    user_id: params.userId,
    transaction_id: t.transaction_id,
    item_id: params.itemId,
    date: t.date,
    name: t.name,
    merchant_name: t.merchant_name ?? null,
    amount: t.amount,
    category: mapCategory(t) ?? null,
    pending: Boolean(t.pending),
    deleted: false,
    raw_json: t as unknown,
    updated_at: now,
  }));

  if (upserts.length) {
    const { error } = await params.supabase.from('plaid_transactions').upsert(upserts, {
      onConflict: 'user_id,transaction_id',
    });
    if (error) throw new Error(error.message);
  }

  const removedIds = params.sync.removed.map((r) => r.transaction_id).filter(Boolean);
  if (removedIds.length) {
    // Soft-delete any removed txns. If txn row never existed, ignore.
    const { error } = await params.supabase
      .from('plaid_transactions')
      .update({ deleted: true, updated_at: now })
      .eq('user_id', params.userId)
      .in('transaction_id', removedIds);
    if (error) throw new Error(error.message);
  }
}

export async function runPlaidSyncAndPersist(params: {
  supabase: SupabaseClient;
  plaid: PlaidApi;
  userId: string;
  plaidItemRow: {
    id: string;
    item_id: string | null;
    access_token: string;
    transactions_cursor: string | null;
  };
}): Promise<PlaidSyncSummary> {
  const sync = await plaidTransactionsSyncAll({
    plaid: params.plaid,
    accessToken: params.plaidItemRow.access_token,
    cursor: params.plaidItemRow.transactions_cursor,
  });

  await upsertPlaidSyncToDb({
    supabase: params.supabase,
    userId: params.userId,
    itemId: params.plaidItemRow.item_id,
    sync,
  });

  const { error: cursorErr } = await params.supabase
    .from('plaid_items')
    .update({
      transactions_cursor: sync.nextCursor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.plaidItemRow.id);

  if (cursorErr) throw new Error(cursorErr.message);

  return {
    ok: true,
    nextCursor: sync.nextCursor,
    added: sync.added.length,
    modified: sync.modified.length,
    removed: sync.removed.length,
  };
}
