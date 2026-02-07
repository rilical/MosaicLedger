import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';
import { hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';
import { hasSupabaseEnv } from '../../../../lib/env';
import { supabaseServer } from '../../../../lib/supabase/server';

function readCreatedId(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const nested =
    o.objectCreated && typeof o.objectCreated === 'object'
      ? (o.objectCreated as Record<string, unknown>)
      : null;
  const cand = (nested?._id ?? nested?.id ?? o._id ?? o.id) as unknown;
  return typeof cand === 'string' && cand.trim() ? cand : null;
}

export async function POST() {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  if (judgeMode || demoMode) {
    return NextResponse.json(
      { ok: false, error: 'Nessie is disabled in judge/demo mode (falls back to demo data).' },
      { status: 400 },
    );
  }

  if (!hasNessieEnv()) {
    return NextResponse.json(
      { ok: false, error: 'Missing NESSIE_API_KEY (server-only).' },
      { status: 400 },
    );
  }

  const envCustomerId = process.env.NESSIE_CUSTOMER_ID?.trim() || null;
  const envAccountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;

  // Prefer explicit env-provided IDs (works for GET-only keys).
  if (envCustomerId || envAccountId) {
    return NextResponse.json({
      ok: true,
      customerId: envCustomerId ?? undefined,
      accountId: envAccountId ?? undefined,
      mode: 'env',
    });
  }

  const nessie = nessieServerClient();

  // Attempt to create a customer + checking account. If the key is read-only, return a clear error.
  const custResp = await nessie.createCustomer({
    first_name: 'Mosaic',
    last_name: 'Ledger',
    address: {
      street_number: '1',
      street_name: 'Hackathon Way',
      city: 'Pittsburgh',
      state: 'PA',
      zip: '15213',
    },
  });

  if (!custResp.ok) {
    const msg =
      custResp.code === 'forbidden'
        ? 'Key appears to be GET-only. Set NESSIE_CUSTOMER_ID and NESSIE_ACCOUNT_ID manually.'
        : custResp.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const customerId = readCreatedId(custResp.data);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: 'Nessie customer created but missing id in response.' },
      { status: 500 },
    );
  }

  const acctResp = await nessie.createAccount(customerId, {
    type: 'Checking',
    nickname: 'MosaicLedger',
    rewards: 0,
    balance: 2500,
  });

  if (!acctResp.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Customer created (${customerId}) but account creation failed: ${acctResp.message}`,
      },
      { status: 400 },
    );
  }

  const accountId = readCreatedId(acctResp.data);
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: 'Nessie account created but missing id in response.' },
      { status: 500 },
    );
  }

  // Best-effort persistence (per-user) in Supabase overrides for convenience.
  // Non-blocking: the client stores these IDs in localStorage for demo evidence anyway.
  if (hasSupabaseEnv()) {
    try {
      const sb = await supabaseServer();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        await sb.from('user_overrides').upsert(
          [
            { user_id: user.id, kind: 'nessie', key: 'customer_id', value: { id: customerId } },
            { user_id: user.id, kind: 'nessie', key: 'account_id', value: { id: accountId } },
          ],
          { onConflict: 'user_id,kind,key' },
        );
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true, customerId, accountId, mode: 'created' });
}
