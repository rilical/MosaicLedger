import { NextResponse } from 'next/server';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';
import { getNessieBaseUrl, hasNessieEnv, nessieServerClient } from '../../../../lib/nessie/serverClient';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && Boolean(v.trim());
}

function maskId(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function pickPreferredAccountId(accounts: unknown[]): string | null {
  const ranked = [...accounts].sort((a, b) => {
    const at =
      a && typeof a === 'object' && 'type' in (a as Record<string, unknown>)
        ? String((a as Record<string, unknown>).type ?? '')
        : '';
    const bt =
      b && typeof b === 'object' && 'type' in (b as Record<string, unknown>)
        ? String((b as Record<string, unknown>).type ?? '')
        : '';
    const score = (t: string) =>
      t.toLowerCase().includes('checking') ? 0 : t.toLowerCase().includes('credit') ? 1 : 2;
    return score(at) - score(bt);
  });

  for (const a of ranked) {
    if (!a || typeof a !== 'object') continue;
    const o = a as Record<string, unknown>;
    const accountId = isNonEmptyString(o._id)
      ? o._id.trim()
      : isNonEmptyString(o.id)
        ? o.id.trim()
        : null;
    if (accountId) return accountId;
  }
  return null;
}

export async function GET() {
  const baseUrl = getNessieBaseUrl();

  if (!hasNessieEnv()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      baseUrl,
      keyPresent: false,
    });
  }

  const nessie = nessieServerClient();

  const accountsResp = await nessie.listAssignedAccounts();
  if (!accountsResp.ok) {
    return NextResponse.json({
      ok: true,
      configured: true,
      baseUrl,
      keyPresent: true,
      accounts: { ok: false, status: accountsResp.status, code: accountsResp.code, message: accountsResp.message },
    });
  }

  const accounts = Array.isArray(accountsResp.data) ? accountsResp.data : [];
  const accountId = pickPreferredAccountId(accounts as unknown[]);

  if (!accountId) {
    return NextResponse.json({
      ok: true,
      configured: true,
      baseUrl,
      keyPresent: true,
      accounts: { ok: true, count: accounts.length },
      selectedAccountId: null,
      purchases: { ok: true, count: 0, sample: [] },
    });
  }

  const purchasesResp = await nessie.listPurchases(accountId);
  if (!purchasesResp.ok) {
    return NextResponse.json({
      ok: true,
      configured: true,
      baseUrl,
      keyPresent: true,
      accounts: { ok: true, count: accounts.length },
      selectedAccountId: maskId(accountId),
      purchases: {
        ok: false,
        status: purchasesResp.status,
        code: purchasesResp.code,
        message: purchasesResp.message,
      },
    });
  }

  const rawPurchases = Array.isArray(purchasesResp.data) ? purchasesResp.data : [];
  const sample = rawPurchases
    .slice(0, 5)
    .map((p) => nessiePurchaseToNormalized(p, { source: 'nessie', accountId }))
    .filter((t) => t != null)
    .map((t) => ({
      id: maskId(t.id),
      date: t.date,
      amount: t.amount,
      merchant: t.merchant,
      category: t.category,
      pending: t.pending,
    }));

  return NextResponse.json({
    ok: true,
    configured: true,
    baseUrl,
    keyPresent: true,
    accounts: { ok: true, count: accounts.length },
    selectedAccountId: maskId(accountId),
    purchases: { ok: true, count: rawPurchases.length, sample },
  });
}
