import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';

export async function POST() {
  if (!hasPlaidEnv()) {
    return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 503 });
  }

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
    .select('access_token')
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

  const accessToken = firstItem.access_token as string;

  // Fetch last 90 days of transactions.
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
  const transactions = txnResp.data.transactions.map((t) => ({
    date: t.date,
    name: t.merchant_name ?? t.name,
    amount: t.amount, // Plaid: positive = debit (spend)
    category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
  }));

  return NextResponse.json({ ok: true, transactions });
}
