import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { applyFixtureSyncState, getPlaidSyncFixture } from '@mosaicledger/banking';
import { runPlaidSyncAndPersist } from '../../../../lib/plaid/transactionsSync';

export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Get the user's most recent active Plaid item.
  const { data: items, error: dbError } = await supabase
    .from('plaid_items')
    .select('id,access_token,provider,item_id,transactions_cursor')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  const firstItem = items?.[0];
  if (!firstItem) {
    return NextResponse.json({ ok: false, error: 'no linked bank account' }, { status: 404 });
  }

  if (dbError) {
    // If schema is partially applied (missing columns), fall back to legacy behavior.
    if (!hasPlaidEnv()) {
      const state = applyFixtureSyncState(getPlaidSyncFixture());
      const transactions = state.map((t) => ({
        date: t.date,
        name: t.merchant_name ?? t.name,
        amount: t.amount,
        category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
      }));
      return NextResponse.json({ ok: true, transactions, mode: 'fixture' as const });
    }

    const { data: legacyItems, error: legacyErr } = await supabase
      .from('plaid_items')
      .select('id,access_token')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (legacyErr) {
      return NextResponse.json({ ok: false, error: legacyErr.message }, { status: 500 });
    }

    const legacyFirst = legacyItems?.[0] as { id?: string; access_token?: string } | undefined;
    if (!legacyFirst?.access_token) {
      return NextResponse.json({ ok: false, error: 'no linked bank account' }, { status: 404 });
    }

    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const plaid = plaidServerClient();
    const txnResp = await plaid.transactionsGet({
      access_token: legacyFirst.access_token,
      start_date: start,
      end_date: end,
      options: { count: 500 },
    });
    const transactions = txnResp.data.transactions.map((t) => ({
      date: t.date,
      name: t.merchant_name ?? t.name,
      amount: t.amount,
      category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
    }));
    return NextResponse.json({ ok: true, transactions, mode: 'plaid_legacy' as const });
  }

  const provider = (firstItem as { provider?: unknown }).provider;

  let transactions: Array<{ date: string; name: string; amount: number; category?: string }>;

  // Demo-safe offline mode: fixture-backed "Plaid-like" sync pack.
  if (!hasPlaidEnv() || provider === 'plaid_fixture') {
    const state = applyFixtureSyncState(getPlaidSyncFixture());
    transactions = state.map((t) => ({
      date: t.date,
      name: t.merchant_name ?? t.name,
      amount: t.amount,
      category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
    }));
  } else {
    // Cursor-based sync: persist txns to DB and then read current state.
    try {
      const plaid = plaidServerClient();
      await runPlaidSyncAndPersist({
        supabase,
        plaid,
        userId: user.id,
        plaidItemRow: firstItem as unknown as {
          id: string;
          item_id: string | null;
          access_token: string;
          transactions_cursor: string | null;
        },
      });

      const { data: rows, error: txErr } = await supabase
        .from('plaid_transactions')
        .select('date,name,merchant_name,amount,category,deleted')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('date', { ascending: false })
        .limit(5000);

      if (txErr) throw new Error(txErr.message);

      transactions = (rows ?? []).map((r) => ({
        date: String((r as { date?: unknown }).date),
        name: String(
          (r as { merchant_name?: unknown }).merchant_name ??
            (r as { name?: unknown }).name ??
            'UNKNOWN',
        ),
        amount: Number((r as { amount?: unknown }).amount),
        category: ((r as { category?: unknown }).category ?? undefined) as string | undefined,
      }));
    } catch {
      // Hard fallback: keep the endpoint working even if schema isn't applied yet.
      const accessToken = (firstItem as { access_token?: unknown }).access_token as string;
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const plaid = plaidServerClient();
      const txnResp = await plaid.transactionsGet({
        access_token: accessToken,
        start_date: start,
        end_date: end,
        options: { count: 500 },
      });

      transactions = txnResp.data.transactions.map((t) => ({
        date: t.date,
        name: t.merchant_name ?? t.name,
        amount: t.amount,
        category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
      }));
    }
  }

  // Best-effort: record a "last sync" timestamp without storing any PII.
  try {
    await supabase
      .from('plaid_items')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', (firstItem as { id?: unknown }).id as string);
  } catch {
    // Non-blocking for hackathon demo.
  }

  return NextResponse.json({ ok: true, transactions });
}
