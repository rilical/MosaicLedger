import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockUser = { id: string; email?: string | null } | null;

let mockUser: MockUser = { id: 'u_1', email: 'test@example.com' };
let nessieCustomersRow: unknown = null;
let existingTxnIds = new Set<string>();

let nessieClient: {
  listAccounts: (customerId: string) => Promise<unknown>;
  listPurchases: (accountId: string) => Promise<unknown>;
  createCustomer?: (payload: Record<string, unknown>) => Promise<unknown>;
  createAccount?: (customerId: string, payload: Record<string, unknown>) => Promise<unknown>;
};

let lastNessieCustomersUpsert: unknown = null;
let lastTxNormUpserts: unknown = null;

let supabaseMock: unknown;

vi.mock('../src/lib/supabase/server', () => ({
  supabaseServer: async () => supabaseMock,
}));

vi.mock('../src/lib/nessie/serverClient', () => ({
  hasNessieEnv: () => true,
  nessieServerClient: () => nessieClient,
}));

function makeSupabaseMock(): unknown {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
    from: (table: string) => {
      if (table === 'nessie_customers') {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(async () => ({ data: nessieCustomersRow, error: null }));
        chain.upsert = vi.fn(async (rows: unknown) => {
          lastNessieCustomersUpsert = rows;
          return { error: null };
        });
        return chain;
      }

      if (table === 'transactions_normalized') {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.order = vi.fn(() => chain);
        chain.limit = vi.fn(() => chain);
        chain.in = vi.fn(async (_col: string, ids: string[]) => {
          const hits = ids.filter((id) => existingTxnIds.has(id));
          return { data: hits.map((txn_id) => ({ txn_id })), error: null };
        });
        chain.upsert = vi.fn(async (rows: Array<{ txn_id: string }>) => {
          lastTxNormUpserts = rows;
          for (const r of rows) existingTxnIds.add(r.txn_id);
          return { error: null };
        });
        return chain;
      }

      if (table === 'user_overrides') {
        return { upsert: vi.fn(async () => ({ error: null })) };
      }

      // Default: minimal stub for tables we don't touch in these tests.
      return {};
    },
  };
}

function purchasesFor(accountId: string): Array<Record<string, unknown>> {
  const base = accountId === 'acct_1' ? 1 : 11;
  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 10; i++) {
    out.push({
      _id: `p_${base + i}`,
      amount: 10 + i,
      description: `Vendor ${base + i}`,
      purchase_date: '2026-02-01',
      type: 'Food',
    });
  }
  return out;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = '0';
  process.env.NEXT_PUBLIC_JUDGE_MODE = '0';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon';
  process.env.NESSIE_API_KEY = 'test_key';
  delete process.env.NESSIE_CUSTOMER_ID;
  delete process.env.NESSIE_ACCOUNT_ID;

  mockUser = { id: 'u_1', email: 'test@example.com' };
  nessieCustomersRow = null;
  existingTxnIds = new Set(['p_1', 'p_2', 'p_3', 'p_4', 'p_5']);

  lastNessieCustomersUpsert = null;
  lastTxNormUpserts = null;

  nessieClient = {
    listAccounts: vi.fn(async () => ({ ok: true, data: [{ _id: 'acct_1' }, { _id: 'acct_2' }] })),
    listPurchases: vi.fn(async (accountId: string) => ({
      ok: true,
      data: purchasesFor(accountId),
    })),
    createCustomer: vi.fn(async () => ({ ok: true, data: { objectCreated: { _id: 'cust_new' } } })),
    createAccount: vi.fn(async () => ({ ok: true, data: { objectCreated: { _id: 'acct_new' } } })),
  };

  supabaseMock = makeSupabaseMock();
});

describe('/api/nessie/bootstrap', () => {
  it('reuses existing per-user binding from nessie_customers', async () => {
    nessieCustomersRow = { nessie_customer_id: 'cust_1', nessie_account_id: 'acct_1' };

    const route = await import('../src/app/api/nessie/bootstrap/route');
    const resp = await route.POST();
    const json = (await resp.json()) as Record<string, unknown>;

    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.customerId).toBe('cust_1');
    expect(json.accountId).toBe('acct_1');
    expect(json.mode).toBe('db');
  });

  it('creates and persists a new Nessie customer binding when missing', async () => {
    nessieCustomersRow = null;

    const route = await import('../src/app/api/nessie/bootstrap/route');
    const resp = await route.POST();
    const json = (await resp.json()) as Record<string, unknown>;

    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.customerId).toBe('cust_new');
    expect(json.accountId).toBe('acct_new');
    expect(json.mode).toBe('created');
    expect(Array.isArray(lastNessieCustomersUpsert)).toBe(true);
  });
});

describe('/api/nessie/sync', () => {
  it('upserts purchases into transactions_normalized and dedupes on rerun', async () => {
    nessieCustomersRow = { nessie_customer_id: 'cust_1', nessie_account_id: null };

    const route = await import('../src/app/api/nessie/sync/route');

    const resp1 = await route.POST(
      new Request('http://localhost/api/nessie/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const json1 = (await resp1.json()) as {
      ok: boolean;
      counts: {
        accounts: number;
        purchases: number;
        inserted: number;
        deduped: number;
      };
    };

    expect(resp1.status).toBe(200);
    expect(json1.ok).toBe(true);
    expect(json1.counts.accounts).toBe(2);
    expect(json1.counts.purchases).toBe(20);
    expect(json1.counts.inserted).toBe(15);
    expect(json1.counts.deduped).toBe(5);
    expect(Array.isArray(lastTxNormUpserts)).toBe(true);

    const resp2 = await route.POST(
      new Request('http://localhost/api/nessie/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const json2 = (await resp2.json()) as {
      ok: boolean;
      counts: {
        accounts: number;
        purchases: number;
        inserted: number;
        deduped: number;
      };
    };

    expect(resp2.status).toBe(200);
    expect(json2.ok).toBe(true);
    expect(json2.counts.accounts).toBe(2);
    expect(json2.counts.purchases).toBe(20);
    expect(json2.counts.inserted).toBe(0);
    expect(json2.counts.deduped).toBe(20);
  });
});
