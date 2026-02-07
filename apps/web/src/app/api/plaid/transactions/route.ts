import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { applyFixtureSyncState, getPlaidSyncFixture } from '@mosaicledger/banking';

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
    .select('id,access_token,provider,item_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (dbError) {
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  const firstItem = items?.[0];
  if (!firstItem) {
    return NextResponse.json({ ok: false, error: 'no linked bank account' }, { status: 404 });
  }

  const provider = (firstItem as { provider?: unknown }).provider;
  const accessToken = (firstItem as { access_token?: unknown }).access_token as string;

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
    // Fetch last 90 days of transactions (legacy endpoint for now; upgraded in BANKP-001).
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const plaid = plaidServerClient();
    const txnResp = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: start,
      end_date: end,
      options: { count: 500 },
    });

    // Map Plaid transactions to the RawTransactionInput shape the engine expects.
    transactions = txnResp.data.transactions.map((t) => ({
      date: t.date,
      name: t.merchant_name ?? t.name,
      amount: t.amount, // Plaid: positive = debit (spend)
      category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
    }));
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
