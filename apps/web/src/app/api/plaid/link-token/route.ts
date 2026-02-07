import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';
import { supabaseServer } from '../../../../lib/supabase/server';
import { hasPlaidEnv, plaidServerClient } from '../../../../lib/plaid/serverClient';
import { hasPlaidTokenEncryptionKey } from '../../../../lib/plaid/tokenCrypto';
import { CountryCode, Products } from 'plaid';

export async function POST() {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  // Never block demos on Plaid availability.
  if (judgeMode || demoMode || !hasPlaidEnv() || !hasPlaidTokenEncryptionKey()) {
    return NextResponse.json({ ok: true, mode: 'fixture' as const });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  try {
    const plaid = plaidServerClient();
    const resp = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'MosaicLedger',
      language: 'en',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
    });

    return NextResponse.json({ ok: true, mode: 'plaid' as const, linkToken: resp.data.link_token });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'unknown';
    return NextResponse.json(
      { ok: false, error: `plaid link token failed (${msg})` },
      { status: 500 },
    );
  }
}
