import 'server-only';

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

function toYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return toYyyyMmDd(d);
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  let accountId: string | null = null;

  try {
    const { data: row, error } = await sb
      .from('nessie_customers')
      .select('nessie_customer_id,nessie_account_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && row) {
      const r = row as unknown as { nessie_customer_id?: unknown; nessie_account_id?: unknown };
      customerId = typeof r.nessie_customer_id === 'string' ? r.nessie_customer_id : null;
      accountId = typeof r.nessie_account_id === 'string' ? r.nessie_account_id : null;
    }
  } catch {
    // ignore
  }

  customerId = customerId ?? bodyCustomerId ?? envCustomerId ?? null;
  accountId = accountId ?? bodyAccountId ?? envAccountId ?? null;

  if (!accountId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Missing Nessie account id. Run /api/nessie/bootstrap first (preferred), or set NESSIE_ACCOUNT_ID.',
      },
      { status: 400 },
    );
  }

  const nessie = nessieServerClient();

  // Create a few merchants (lightweight). Some Nessie deployments require merchant_id on purchases.
  const merchantNames = ['Mosaic Coffee', 'Mosaic Grocery', 'Mosaic Rides', 'Mosaic Tools'];
  const merchantIds: string[] = [];
  for (const name of merchantNames) {
    const mResp = await nessie.createMerchant({
      name,
      category: name.includes('Coffee')
        ? 'Coffee'
        : name.includes('Grocery')
          ? 'Groceries'
          : name.includes('Rides')
            ? 'Transport'
            : 'Supplies',
      address: {
        street_number: '1',
        street_name: 'Hackathon Way',
        city: 'Pittsburgh',
        state: 'PA',
        zip: '15213',
      },
      geocode: { lat: 40.4433, lng: -79.9436 },
    });
    if (!mResp.ok) {
      return NextResponse.json({ ok: false, error: mResp.message }, { status: 400 });
    }
    const id = readCreatedId(mResp.data);
    if (id) merchantIds.push(id);
  }

  if (merchantIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create merchants for simulation.' },
      { status: 500 },
    );
  }

  // Deterministic-ish simulation: stable pattern per user, but varies across users.
  const rng = mulberry32(hashSeed(user.id));

  const purchasePlan: Array<{
    day: string;
    merchantId: string;
    desc: string;
    type: string;
    amount: number;
  }> = [];

  for (let d = 6; d >= 0; d--) {
    const day = utcDaysAgo(d);
    // Always include a small coffee purchase, then a second purchase that varies.
    purchasePlan.push({
      day,
      merchantId: merchantIds[0]!,
      desc: 'Coffee',
      type: 'coffee',
      amount: Number((4.25 + Math.floor(rng() * 400) / 100).toFixed(2)),
    });

    const pick = Math.floor(rng() * 3) + 1; // 1..3
    const amtBase = pick === 1 ? 28 : pick === 2 ? 16 : 44;
    const amount = Number((amtBase + Math.floor(rng() * 1200) / 100).toFixed(2));
    purchasePlan.push({
      day,
      merchantId: merchantIds[pick]!,
      desc: pick === 1 ? 'Groceries' : pick === 2 ? 'Ride' : 'Supplies',
      type: pick === 1 ? 'groceries' : pick === 2 ? 'transport' : 'supplies',
      amount,
    });
  }

  // Force one duplicate suspect (same day + same merchant + same amount).
  const dupDay = utcDaysAgo(2);
  purchasePlan.push({
    day: dupDay,
    merchantId: merchantIds[2]!,
    desc: 'Ride (duplicate suspect)',
    type: 'transport',
    amount: 19.99,
  });
  purchasePlan.push({
    day: dupDay,
    merchantId: merchantIds[2]!,
    desc: 'Ride (duplicate suspect)',
    type: 'transport',
    amount: 19.99,
  });

  let created = 0;
  for (const p of purchasePlan) {
    const resp = await nessie.createPurchase(accountId, {
      merchant_id: p.merchantId,
      medium: 'balance',
      purchase_date: p.day,
      amount: p.amount,
      description: p.desc,
      type: p.type,
      status: 'completed',
    });
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: `purchase create failed: ${resp.message}` },
        { status: 400 },
      );
    }
    created += 1;
  }

  // After simulation: fetch purchases and persist into transactions_normalized (same as /api/nessie/sync).
  const purchasesResp = await nessie.listPurchases(accountId);
  if (!purchasesResp.ok) {
    return NextResponse.json({ ok: false, error: purchasesResp.message }, { status: 400 });
  }

  const purchases = purchasesResp.data ?? [];
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

  for (const raw of purchases) {
    const t = nessiePurchaseToNormalized(raw, { source: 'nessie', accountId });
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
      raw_json: raw as unknown,
      updated_at: now,
    });
  }

  const upserts = Array.from(upsertById.values());
  if (upserts.length) {
    const { error: upErr } = await sb.from('transactions_normalized').upsert(upserts, {
      onConflict: 'user_id,source,txn_id',
    });
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
    }
  }

  // Best-effort: ensure binding is filled.
  try {
    if (customerId) {
      await sb.from('nessie_customers').upsert(
        [
          {
            user_id: user.id,
            nessie_customer_id: customerId,
            nessie_account_id: accountId,
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
    simulated: { merchants: merchantIds.length, purchasesCreated: created },
    synced: { purchasesFetched: purchases.length, upserted: upserts.length },
  });
}
