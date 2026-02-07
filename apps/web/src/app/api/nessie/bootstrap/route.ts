import { NextResponse } from 'next/server';
import { hasSupabaseEnv } from '../../../../lib/env';
import { hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';
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

async function upsertNessieCustomerRow(params: {
  userId: string;
  customerId: string;
  accountId: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const sb = await supabaseServer();
  const now = new Date().toISOString();

  // Prefer the dedicated connector table (C1-NESSIE-001).
  try {
    const { error } = await sb.from('nessie_customers').upsert(
      [
        {
          user_id: params.userId,
          nessie_customer_id: params.customerId,
          nessie_account_id: params.accountId,
          updated_at: now,
        },
      ],
      { onConflict: 'user_id' },
    );
    if (!error) return;
  } catch {
    // ignore (schema may not be applied yet)
  }

  // Back-compat fallback: store in generic overrides table if present.
  try {
    await sb.from('user_overrides').upsert(
      [
        {
          user_id: params.userId,
          kind: 'nessie',
          key: 'customer_id',
          value: { id: params.customerId },
        },
        ...(params.accountId
          ? [
              {
                user_id: params.userId,
                kind: 'nessie',
                key: 'account_id',
                value: { id: params.accountId },
              },
            ]
          : []),
      ],
      { onConflict: 'user_id,kind,key' },
    );
  } catch {
    // ignore
  }
}

export async function POST() {
  // Nessie is optional. We try to provide a useful binding if Supabase/auth are available,
  // but we also support env-only IDs for judge/demo deployments.

  if (!hasNessieEnv()) {
    return NextResponse.json(
      { ok: false, error: 'Missing NESSIE_API_KEY (server-only).' },
      { status: 400 },
    );
  }

  const envCustomerId = process.env.NESSIE_CUSTOMER_ID?.trim() || null;
  const envAccountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;

  // Env-only binding: works without Supabase/auth. This is the most deploy-friendly path.
  if (!hasSupabaseEnv()) {
    if (!envCustomerId && !envAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Supabase not configured. Set NESSIE_ACCOUNT_ID (and optionally NESSIE_CUSTOMER_ID) to use Nessie in judge/demo deployments.',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      customerId: envCustomerId ?? undefined,
      accountId: envAccountId ?? undefined,
      mode: 'env_noauth',
    });
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // If user isn't authenticated, still allow env binding so the UI can proceed.
  if (!user) {
    if (envCustomerId || envAccountId) {
      return NextResponse.json({
        ok: true,
        customerId: envCustomerId ?? undefined,
        accountId: envAccountId ?? undefined,
        mode: 'env_noauth',
      });
    }
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Reuse the stable binding if we already have one for this user.
  try {
    const { data: row, error } = await sb
      .from('nessie_customers')
      .select('nessie_customer_id,nessie_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && row) {
      const r = row as unknown as { nessie_customer_id?: unknown; nessie_account_id?: unknown };
      const customerId = typeof r.nessie_customer_id === 'string' ? r.nessie_customer_id : null;
      const accountId = typeof r.nessie_account_id === 'string' ? r.nessie_account_id : null;
      if (customerId) {
        return NextResponse.json({
          ok: true,
          customerId,
          accountId: accountId ?? undefined,
          mode: 'db',
        });
      }
    }
  } catch {
    // ignore (schema might not be applied yet)
  }

  // Prefer explicit env-provided IDs (works for GET-only keys).
  if (envCustomerId || envAccountId) {
    if (envCustomerId) {
      await upsertNessieCustomerRow({
        userId: user.id,
        customerId: envCustomerId,
        accountId: envAccountId,
      });
    }
    return NextResponse.json({
      ok: true,
      customerId: envCustomerId ?? undefined,
      accountId: envAccountId ?? undefined,
      mode: 'env',
    });
  }

  const nessie = nessieServerClient();

  // Attempt to create a customer + checking account. If the key is read-only, return a clear error.
  const seed = (user.email ?? 'mosaic.ledger@example.com').split('@')[0] ?? 'Mosaic';
  const custResp = await nessie.createCustomer({
    first_name: seed.slice(0, 16) || 'Mosaic',
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

  await upsertNessieCustomerRow({ userId: user.id, customerId, accountId });

  return NextResponse.json({ ok: true, customerId, accountId, mode: 'created' });
}
