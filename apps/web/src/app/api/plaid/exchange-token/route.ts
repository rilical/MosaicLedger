import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { parseBooleanEnv } from '../../../../lib/env';

export async function POST(request: Request) {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let publicToken: string;
  try {
    const body = (await request.json()) as { publicToken?: string };
    if (!body.publicToken) throw new Error('missing publicToken');
    publicToken = body.publicToken;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  // Demo-safe fallback: create a fixture-backed item even if Plaid isn't configured.
  if (judgeMode || demoMode || !hasPlaidEnv()) {
    const fixtureItemId = 'fixture_item';
    const fixtureAccessToken = 'fixture_access_token';

    // Idempotent insert: if a fixture item already exists, keep it.
    const { data: existing, error: existingErr } = await supabase
      .from('plaid_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', fixtureItemId)
      .limit(1);

    if (existingErr) {
      return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
    }

    if (!existing?.length) {
      const { error: dbError } = await supabase.from('plaid_items').insert({
        user_id: user.id,
        provider: 'plaid_fixture',
        item_id: fixtureItemId,
        access_token: fixtureAccessToken,
        status: 'active',
      });
      if (dbError) {
        return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, itemId: fixtureItemId, mode: 'fixture' as const });
  }

  const plaid = plaidServerClient();
  const exchangeResp = await plaid.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const { access_token, item_id } = exchangeResp.data;

  // Store in plaid_items table (RLS scoped to user).
  const { error: dbError } = await supabase.from('plaid_items').insert({
    user_id: user.id,
    item_id,
    access_token,
    status: 'active',
  });

  if (dbError) {
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, itemId: item_id, mode: 'plaid' as const });
}
