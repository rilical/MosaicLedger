import { NextResponse } from 'next/server';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';
import { hasSupabaseEnv } from '../../../../lib/env';
import { hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';
import { supabaseServer } from '../../../../lib/supabase/server';

function safeString(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object') return null;
  const v = (body as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase is not configured; cannot persist synced transactions.' },
      { status: 400 },
    );
  }

  if (!hasNessieEnv()) {
    return NextResponse.json(
      { ok: false, error: 'Missing NESSIE_API_KEY (server-only).' },
      { status: 400 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const bodyCustomerId = safeString(body, 'customerId');
  const bodyAccountId = safeString(body, 'accountId');

  const envCustomerId = process.env.NESSIE_CUSTOMER_ID?.trim() || null;
  const envAccountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;

  let customerId: string | null = null;
  let accountIdHint: string | null = null;

  // Prefer the per-user stable binding in DB.
  try {
    const { data: row, error } = await sb
      .from('nessie_customers')
      .select('nessie_customer_id,nessie_account_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && row) {
      const r = row as unknown as { nessie_customer_id?: unknown; nessie_account_id?: unknown };
      customerId = typeof r.nessie_customer_id === 'string' ? r.nessie_customer_id : null;
      accountIdHint = typeof r.nessie_account_id === 'string' ? r.nessie_account_id : null;
    }
  } catch {
    // ignore (schema might not be applied yet)
  }

  customerId = customerId ?? bodyCustomerId ?? envCustomerId ?? null;
  accountIdHint = accountIdHint ?? bodyAccountId ?? envAccountId ?? null;

  if (!customerId && !accountIdHint) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Missing Nessie binding. Run /api/nessie/bootstrap first, or set NESSIE_CUSTOMER_ID/NESSIE_ACCOUNT_ID.',
      },
      { status: 400 },
    );
  }

  const nessie = nessieServerClient();

  // Resolve accounts. Preferred path: list accounts from the customer id.
  let accountIds: string[] = [];
  if (customerId) {
    const accountsResp = await nessie.listAccounts(customerId);
    if (!accountsResp.ok) {
      return NextResponse.json({ ok: false, error: accountsResp.message }, { status: 400 });
    }
    accountIds = (accountsResp.data ?? [])
      .map((a) => a._id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  }
  if (accountIds.length === 0 && accountIdHint) {
    accountIds = [accountIdHint];
  }
  if (accountIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No Nessie accounts found for this customer.' },
      { status: 400 },
    );
  }

  // Fetch purchases for each account (best-effort: partial data is still useful for demo).
  const purchaseResults = await Promise.all(
    accountIds.map(async (acctId) => {
      const resp = await nessie.listPurchases(acctId);
      return { accountId: acctId, resp };
    }),
  );

  const okPurchases = purchaseResults.filter((r) => r.resp.ok);
  if (okPurchases.length === 0) {
    const firstErr = purchaseResults[0]?.resp;
    return NextResponse.json(
      {
        ok: false,
        error: firstErr && !firstErr.ok ? firstErr.message : 'Failed to fetch purchases.',
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const upsertById = new Map<
    string,
    {
      user_id: string;
      source: string;
      txn_id: string;
      date: string;
      amount: number;
      merchant_raw: string;
      merchant: string;
      category: string;
      account_id: string | null;
      pending: boolean;
      raw_json: unknown;
      updated_at: string;
    }
  >();

  let purchasesCount = 0;
  for (const { accountId, resp } of purchaseResults) {
    if (!resp.ok) continue;
    const purchases = resp.data ?? [];
    purchasesCount += purchases.length;
    for (const p of purchases) {
      const t = nessiePurchaseToNormalized(p, { source: 'nessie', accountId });
      if (!t) continue;
      upsertById.set(t.id, {
        user_id: user.id,
        source: 'nessie',
        txn_id: t.id,
        date: t.date,
        amount: t.amount,
        merchant_raw: t.merchantRaw,
        merchant: t.merchant,
        category: t.category,
        account_id: t.accountId ?? null,
        pending: Boolean(t.pending),
        raw_json: p as unknown,
        updated_at: now,
      });
    }
  }

  const upserts = Array.from(upsertById.values());
  const txnIds = Array.from(upsertById.keys());

  // Nothing to persist, but still return a useful response.
  if (upserts.length === 0) {
    return NextResponse.json({
      ok: true,
      counts: { accounts: accountIds.length, purchases: purchasesCount, inserted: 0, deduped: 0 },
    });
  }

  // Compute inserted vs deduped (idempotency evidence).
  let existing = 0;
  const chunkSize = 500;
  for (let i = 0; i < txnIds.length; i += chunkSize) {
    const chunk = txnIds.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from('transactions_normalized')
      .select('txn_id')
      .eq('user_id', user.id)
      .eq('source', 'nessie')
      .in('txn_id', chunk);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    existing += (data ?? []).length;
  }

  const { error: upErr } = await sb.from('transactions_normalized').upsert(upserts, {
    onConflict: 'user_id,source,txn_id',
  });
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }

  // Best-effort: update the per-user binding with a "primary" account id.
  try {
    if (customerId) {
      await sb.from('nessie_customers').upsert(
        [
          {
            user_id: user.id,
            nessie_customer_id: customerId,
            nessie_account_id: accountIds[0] ?? null,
            updated_at: now,
          },
        ],
        { onConflict: 'user_id' },
      );
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    counts: {
      accounts: accountIds.length,
      purchases: purchasesCount,
      inserted: Math.max(0, upserts.length - existing),
      deduped: existing,
    },
  });
}
