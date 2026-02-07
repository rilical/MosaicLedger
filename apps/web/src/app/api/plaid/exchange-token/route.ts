import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';

export async function POST(request: Request) {
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

  let publicToken: string;
  try {
    const body = (await request.json()) as { publicToken?: string };
    if (!body.publicToken) throw new Error('missing publicToken');
    publicToken = body.publicToken;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ ok: true, itemId: item_id });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Plaid API error';
    console.error('[exchange-token] Plaid error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
