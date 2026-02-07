import { NextResponse } from 'next/server';
import {
  computeBankArtifacts,
  computeArtifactsFromNormalized,
  computeDemoArtifacts,
  type AnalyzeRequestV1,
} from '../../../../lib/analysis/compute';
import { getLatestAnalysisRun, insertAnalysisRun } from '../../../../lib/analysis/storage';
import { hasSupabaseEnv, parseBooleanEnv } from '../../../../lib/env';
import { envFlags } from '../../../../lib/flags';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { decryptPlaidAccessToken } from '../../../../lib/plaid/tokenCrypto';
import { supabaseServer } from '../../../../lib/supabase/server';
import { applyFixtureSyncState, getPlaidSyncFixture } from '@mosaicledger/banking';
import { runPlaidSyncAndPersist } from '../../../../lib/plaid/transactionsSync';
import { hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';

export async function GET() {
  if (envFlags.demoMode || envFlags.judgeMode || !hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, latest: null });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const latest = await getLatestAnalysisRun(supabase, user.id);
  return NextResponse.json({ ok: true, latest });
}

export async function POST(request: Request) {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  let body: AnalyzeRequestV1 = {};
  try {
    body = (await request.json()) as AnalyzeRequestV1;
  } catch {
    body = {};
  }

  // Demo/judge safe mode: never require auth or schema.
  if (demoMode || judgeMode || !hasSupabaseEnv()) {
    const artifacts = computeDemoArtifacts(body);
    return NextResponse.json({ ok: true, artifacts, stored: false });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Explicit demo request: always compute demo artifacts, even if a bank is linked.
  if (body.source === 'demo') {
    const artifacts = computeDemoArtifacts(body);
    try {
      await insertAnalysisRun(supabase, user.id, artifacts);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true, artifacts, stored: true });
  }

  // Explicit Nessie request: pull sponsor mock transactions server-side and feed the same deterministic engine.
  if (body.source === 'nessie') {
    try {
      if (!hasNessieEnv()) throw new Error('Missing NESSIE_API_KEY (server-only).');
      const accountId = body.nessie?.accountId?.trim() || process.env.NESSIE_ACCOUNT_ID?.trim();
      if (!accountId) {
        throw new Error(
          'Missing Nessie account id. Set NESSIE_ACCOUNT_ID or run /api/nessie/bootstrap and store the returned id.',
        );
      }
      const nessie = nessieServerClient();
      const purchases = await nessie.getPurchases(accountId);
      if (!purchases.ok) throw new Error(purchases.message);

      const txnsAll = (purchases.data ?? [])
        .map((p) =>
          nessiePurchaseToNormalized(p, {
            source: 'nessie',
            accountId,
          }),
        )
        .filter((t) => t != null);

      const artifacts = computeArtifactsFromNormalized(txnsAll, body, {
        artifactsSource: 'nessie',
      });

      try {
        await insertAnalysisRun(supabase, user.id, artifacts);
      } catch {
        // ignore
      }
      return NextResponse.json({ ok: true, artifacts, stored: true });
    } catch {
      // Sponsor API should never block the demo.
      const artifacts = computeDemoArtifacts(body);
      return NextResponse.json({ ok: true, artifacts, stored: false });
    }
  }

  // If user has a linked bank account, use real transactions.
  let artifacts;
  const { data: plaidItems } = await supabase
    .from('plaid_items')
    .select('id,access_token,provider,item_id,transactions_cursor')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  const firstItem = plaidItems?.[0];
  if (firstItem) {
    const provider = (firstItem as { provider?: unknown }).provider;

    if (!hasPlaidEnv() || provider === 'plaid_fixture') {
      const state = applyFixtureSyncState(getPlaidSyncFixture());
      const raw = state.map((t) => ({
        date: t.date,
        name: t.merchant_name ?? t.name,
        amount: t.amount,
        category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
      }));

      artifacts = computeBankArtifacts(raw, body);
      artifacts.source = provider === 'plaid_fixture' ? 'plaid_fixture' : 'plaid';
    } else {
      // Prefer cursor-based sync backed by DB cache; fall back to legacy get if schema isn't applied.
      try {
        const item = firstItem as unknown as {
          id: string;
          item_id: string | null;
          access_token: string;
          transactions_cursor: string | null;
        };

        const accessToken = decryptPlaidAccessToken(item.access_token);
        const plaid = plaidServerClient();
        await runPlaidSyncAndPersist({
          supabase,
          plaid,
          userId: user.id,
          plaidItemRow: { ...item, access_token: accessToken },
        });

        const { data: rows, error: txErr } = await supabase
          .from('plaid_transactions')
          .select('date,name,merchant_name,amount,category,deleted')
          .eq('user_id', user.id)
          .eq('deleted', false)
          .order('date', { ascending: false })
          .limit(20000);

        if (txErr) throw new Error(txErr.message);

        const raw = (rows ?? []).map((r) => ({
          date: String((r as { date?: unknown }).date),
          name: String(
            (r as { merchant_name?: unknown }).merchant_name ??
              (r as { name?: unknown }).name ??
              'UNKNOWN',
          ),
          amount: Number((r as { amount?: unknown }).amount),
          category: ((r as { category?: unknown }).category ?? undefined) as string | undefined,
        }));

        artifacts = computeBankArtifacts(raw, body);
        artifacts.source = 'plaid';
      } catch {
        // Hard fallback: if sync/schema/decrypt fails, try legacy get; if that fails, fall back to demo.
        try {
          const stored = firstItem.access_token as string;
          const accessToken = decryptPlaidAccessToken(stored);
          const end = new Date().toISOString().slice(0, 10);
          const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

          const plaid = plaidServerClient();
          const txnResp = await plaid.transactionsGet({
            access_token: accessToken,
            start_date: start,
            end_date: end,
            options: { count: 500 },
          });

          const raw = txnResp.data.transactions.map((t) => ({
            date: t.date,
            name: t.merchant_name ?? t.name,
            amount: t.amount,
            category: t.personal_finance_category?.primary ?? t.category?.[0] ?? undefined,
          }));

          artifacts = computeBankArtifacts(raw, body);
          artifacts.source = 'plaid';
        } catch {
          artifacts = computeDemoArtifacts(body);
        }
      }
    }

    // Best-effort: record a "last sync" timestamp. Do not block the response if this fails.
    try {
      await supabase
        .from('plaid_items')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', (firstItem as { id?: unknown }).id as string);
    } catch {
      // ignore
    }
  } else {
    // Fallback to demo data if no bank linked.
    artifacts = computeDemoArtifacts(body);
  }

  try {
    await insertAnalysisRun(supabase, user.id, artifacts);
  } catch {
    // If schema isn't applied yet, still return computed artifacts.
  }

  return NextResponse.json({ ok: true, artifacts, stored: true });
}
