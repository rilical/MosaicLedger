import { NextResponse } from 'next/server';
import type { RawTransactionInput } from '@mosaicledger/core';
import { parseBooleanEnv } from '../../../../lib/env';
import { hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';

function safeAccountId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const v = (body as { accountId?: unknown }).accountId;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function POST(request: Request) {
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

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const accountId = safeAccountId(body) ?? process.env.NESSIE_ACCOUNT_ID?.trim() ?? null;
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: 'Missing accountId (set NESSIE_ACCOUNT_ID or pass it in the request).' },
      { status: 400 },
    );
  }

  const nessie = nessieServerClient();
  const purchases = await nessie.getPurchases(accountId);
  if (!purchases.ok) {
    return NextResponse.json({ ok: false, error: purchases.message }, { status: 400 });
  }

  const raw: RawTransactionInput[] = (purchases.data ?? []).map((p) => ({
    date: (p.purchase_date ?? new Date().toISOString().slice(0, 10)) as string,
    name: (p.description ?? 'Purchase') as string,
    amount: Number(p.amount) || 0,
    category: p.type ?? undefined,
  }));

  return NextResponse.json({
    ok: true,
    accountId,
    count: raw.length,
    raw,
  });
}
