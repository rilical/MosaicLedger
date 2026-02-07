import 'server-only';

import { NextResponse } from 'next/server';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';
import { computeDemoArtifacts } from '../../../../lib/analysis/compute';
import { hasSupabaseEnv } from '../../../../lib/env';
import { envFlags } from '../../../../lib/flags';
import {
  hasNessieEnv,
  nessieServerClient,
  type NessieAtm,
  type NessieBill,
  type NessieBranch,
  type NessieResult,
} from '../../../../lib/nessie/serverClient';
import { supabaseServer } from '../../../../lib/supabase/server';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseNum(v: string | null, fallback: number): number {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(yyyyMmDd: string, days: number): string {
  const dt = new Date(`${yyyyMmDd}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toYyyyMmDd(dt);
}

function okOrNull<T>(r: NessieResult<T>): T | null {
  return r.ok ? r.data : null;
}

function upcomingBills(bills: NessieBill[]): { upcomingCount: number; upcomingIds: string[] } {
  const now = toYyyyMmDd(new Date());
  const end = addDays(now, 30);
  const upcoming = bills
    .filter((b) => {
      const d = (b.upcoming_payment_date || b.payment_date || '').slice(0, 10);
      return d >= now && d <= end;
    })
    .slice(0, 20);
  return {
    upcomingCount: upcoming.length,
    upcomingIds: upcoming.map((b) => String(b._id ?? '')).filter(Boolean),
  };
}

async function resolveBinding(): Promise<{ accountId: string | null }> {
  const envAccountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;
  if (envAccountId) return { accountId: envAccountId };

  if (!hasSupabaseEnv() || envFlags.demoMode || envFlags.judgeMode) return { accountId: null };

  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { accountId: null };

    const { data: row, error } = await sb
      .from('nessie_customers')
      .select('nessie_account_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !row) return { accountId: null };
    const r = row as unknown as { nessie_account_id?: unknown };
    return { accountId: typeof r.nessie_account_id === 'string' ? r.nessie_account_id : null };
  } catch {
    return { accountId: null };
  }
}

function demoPayload() {
  const demo = computeDemoArtifacts({ preset: 'this_month' });
  const txns = demo.transactions ?? [];
  const byMerchant = demo.summary.byMerchant ?? {};

  const accounts = [
    { _id: 'demo_checking', type: 'Checking', nickname: 'Demo Checking', balance: 2500 },
  ];

  const bills: NessieBill[] = (demo.recurring ?? []).slice(0, 8).map((r, idx) => ({
    _id: `demo_bill_${idx + 1}`,
    status: 'pending',
    payee: r.merchant,
    nickname: r.merchant,
    payment_date: r.nextDate,
    upcoming_payment_date: r.nextDate,
    recurring_date: 1,
    account_id: 'demo_checking',
  }));

  const branches: NessieBranch[] = [
    {
      _id: 'demo_branch_1',
      name: 'Capital One Cafe (Demo)',
      phone_number: '000-000-0000',
      address: {
        street_number: '123',
        street_name: 'Hackathon Way',
        city: 'Pittsburgh',
        state: 'PA',
        zip: '15213',
      },
    },
  ];

  const atms: NessieAtm[] = [
    {
      _id: 'demo_atm_1',
      name: 'Capital One ATM (Demo)',
      geocode: { lat: 40.4433, lng: -79.9436 },
      accessibility: true,
      amount_left: 5000,
      hours: ['Always open (demo)'],
    },
  ];

  return {
    ok: true,
    configured: false,
    mode: 'demo' as const,
    accounts,
    purchases: txns.slice(0, 20).map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      merchant: t.merchant,
      category: t.category,
      pending: t.pending,
    })),
    bills,
    branches,
    atms,
    totals: {
      topMerchant: Object.entries(byMerchant).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = clamp(parseNum(url.searchParams.get('lat'), 40.4433), -90, 90);
  const lng = clamp(parseNum(url.searchParams.get('lng'), -79.9436), -180, 180);
  const rad = clamp(parseNum(url.searchParams.get('rad'), 2), 1, 25);

  // Judge/demo safe: don't do sponsor network calls.
  if (envFlags.demoMode || envFlags.judgeMode) {
    return NextResponse.json(demoPayload());
  }

  if (!hasNessieEnv()) {
    return NextResponse.json(demoPayload());
  }

  const binding = await resolveBinding();
  const nessie = nessieServerClient();

  const accountsP = nessie.listAssignedAccounts();
  const accountsResp = await accountsP;
  const accounts = okOrNull(accountsResp) ?? [];

  const accountId =
    binding.accountId ??
    accounts.find((a) => typeof a._id === 'string' && a._id.trim())?._id ??
    null;

  const purchasesP = accountId ? nessie.listPurchases(accountId) : Promise.resolve(null);
  const billsP = accountId ? nessie.listBillsByAccount(accountId) : Promise.resolve(null);
  const branchesP = nessie.listBranches();
  const atmsP = nessie.listAtms({ lat, lng, rad });

  const [purchasesResp, billsResp, branchesResp, atmsResp] = await Promise.all([
    purchasesP,
    billsP,
    branchesP,
    atmsP,
  ]);

  const purchasesRaw =
    purchasesResp && 'ok' in purchasesResp && purchasesResp.ok ? purchasesResp.data : [];
  const purchases = (Array.isArray(purchasesRaw) ? purchasesRaw : [])
    .map((p) =>
      nessiePurchaseToNormalized(
        p as unknown as import('@mosaicledger/connectors').NessiePurchase,
        { source: 'nessie', accountId: accountId ?? 'unknown' },
      ),
    )
    .filter((t) => t != null)
    .slice(0, 30)
    .map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      merchant: t.merchant,
      category: t.category,
      pending: t.pending,
    }));

  const bills = billsResp && 'ok' in billsResp && billsResp.ok ? (billsResp.data ?? []) : [];
  const branchesRaw = okOrNull(branchesResp);
  const atmsRaw = okOrNull(atmsResp);
  const branches = Array.isArray(branchesRaw) ? branchesRaw : [];
  const atms = Array.isArray(atmsRaw) ? atmsRaw : [];
  const up = upcomingBills(bills as NessieBill[]);

  return NextResponse.json({
    ok: true,
    configured: true,
    mode: 'live' as const,
    query: { lat, lng, rad },
    accountId: accountId ?? null,
    accountsCount: accounts.length,
    purchasesCount: purchases.length,
    billsCount: Array.isArray(bills) ? bills.length : 0,
    billsUpcoming30d: up,
    purchases,
    bills: (Array.isArray(bills) ? bills : []).slice(0, 50),
    branches: (branches as NessieBranch[]).slice(0, 50),
    atms: (atms as NessieAtm[]).slice(0, 30),
    errors: {
      accounts: accountsResp.ok ? null : accountsResp.message,
      purchases:
        purchasesResp && 'ok' in purchasesResp && !purchasesResp.ok ? purchasesResp.message : null,
      bills: billsResp && 'ok' in billsResp && !billsResp.ok ? billsResp.message : null,
      branches: branchesResp.ok ? null : branchesResp.message,
      atms: atmsResp.ok ? null : atmsResp.message,
    },
  });
}
