import { NextResponse } from 'next/server';
import {
  computeBankArtifacts,
  computeDemoArtifacts,
  type AnalyzeRequestV1,
} from '../../../../lib/analysis/compute';
import { getLatestAnalysisRun, insertAnalysisRun } from '../../../../lib/analysis/storage';
import { hasSupabaseEnv, parseBooleanEnv } from '../../../../lib/env';
import { envFlags } from '../../../../lib/flags';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { supabaseServer } from '../../../../lib/supabase/server';
import { applyFixtureSyncState, getPlaidSyncFixture } from '@mosaicledger/banking';

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

  // If user has a linked bank account, use real transactions.
  let artifacts;
  const { data: plaidItems } = await supabase
    .from('plaid_items')
    .select('id,access_token,provider')
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
    } else {
      const accessToken = firstItem.access_token as string;
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
