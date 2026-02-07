import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';

type NessieCustomer = { _id?: unknown; id?: unknown; first_name?: unknown; last_name?: unknown };
type NessieAccount = {
  _id?: unknown;
  id?: unknown;
  nickname?: unknown;
  type?: unknown;
  customer_id?: unknown;
};
type NessiePurchase = {
  _id?: unknown;
  amount?: unknown;
  description?: unknown;
  merchant_id?: unknown;
  purchase_date?: unknown;
  status?: unknown;
  type?: unknown;
};

function loadDotEnvFile(filePath: string): void {
  // Minimal .env loader to avoid adding deps.
  // Only sets keys that aren't already defined in process.env.
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1).trim();
    if (!key) continue;
    if (process.env[key] !== undefined) continue;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v || !v.trim()) throw new Error(`Missing ${key}`);
  return v.trim();
}

function baseUrl(): string {
  // Keep aligned with apps/web default.
  const raw = (process.env.NESSIE_BASE_URL ?? 'http://api.nessieisreal.com').replace(/\/+$/, '');
  if (raw.startsWith('https://api.nessieisreal.com')) return raw.replace('https://', 'http://');
  return raw;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await resp.text();
    const body = text.trim() ? (JSON.parse(text) as unknown) : null;
    if (!resp.ok) {
      const msg =
        body && typeof body === 'object' && 'message' in body ? String(body.message) : text;
      throw new Error(`HTTP ${resp.status}: ${msg || 'request failed'}`);
    }
    return body as T;
  } finally {
    clearTimeout(t);
  }
}

function readId(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const cand = o._id ?? o.id;
  return typeof cand === 'string' && cand.trim() ? cand.trim() : null;
}

function readCustomerId(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const cand = o.customer_id;
  return typeof cand === 'string' && cand.trim() ? cand.trim() : null;
}

function withKey(url: string, key: string): string {
  const qp = `key=${encodeURIComponent(key)}`;
  return url.includes('?') ? `${url}&${qp}` : `${url}?${qp}`;
}

function pickPreferredAccount(accounts: NessieAccount[]): {
  accountId: string | null;
  customerId: string | null;
} {
  // Prefer Checking for demo spend mosaics, then Credit Card, then anything.
  const score = (t: string) =>
    t.toLowerCase().includes('checking') ? 0 : t.toLowerCase().includes('credit') ? 1 : 2;
  const ranked = [...accounts].sort(
    (a, b) => score(String(a.type ?? '')) - score(String(b.type ?? '')),
  );

  for (const a of ranked) {
    const accountId = readId(a);
    const customerId = readCustomerId(a);
    if (accountId) return { accountId, customerId };
  }
  return { accountId: null, customerId: null };
}

async function main(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '..');
  loadDotEnvFile(path.join(repoRoot, 'apps/web/.env.local'));
  loadDotEnvFile(path.join(repoRoot, 'apps/web/.env'));

  const key = envOrThrow('NESSIE_API_KEY');
  const base = baseUrl();
  const errors: string[] = [];

  const envCustomerId = process.env.NESSIE_CUSTOMER_ID?.trim() || null;
  const envAccountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;

  console.log(`Nessie base: ${base}`);

  let customerId: string | null = envCustomerId;
  let accountId: string | null = envAccountId;

  // Most direct (per docs): accounts assigned to the API key.
  let assignedAccounts: NessieAccount[] = [];
  if (!accountId || !customerId) {
    try {
      const a = await fetchJson<NessieAccount[]>(withKey(`${base}/accounts`, key));
      assignedAccounts = Array.isArray(a) ? a : [];
      if (!assignedAccounts.length) {
        errors.push('GET /accounts returned 0 accounts (key may not be assigned yet)');
      }
      const picked = pickPreferredAccount(assignedAccounts);
      if (!accountId) accountId = picked.accountId;
      if (!customerId) customerId = picked.customerId;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`GET /accounts failed: ${msg}`);
    }
  }

  // Fallback: list customers then accounts by customer.
  if (!accountId || !customerId) {
    try {
      const customers = await fetchJson<NessieCustomer[]>(withKey(`${base}/customers`, key));
      if (!Array.isArray(customers) || customers.length === 0) {
        errors.push('GET /customers returned 0 customers (key may not be assigned yet)');
      }
      if (!customerId) customerId = readId(customers[0]);
      if (customerId) {
        const accounts = await fetchJson<NessieAccount[]>(
          withKey(`${base}/customers/${encodeURIComponent(customerId)}/accounts`, key),
        );
        const list = Array.isArray(accounts) ? accounts : [];
        if (!list.length) errors.push('GET /customers/{id}/accounts returned 0 accounts');
        const picked = pickPreferredAccount(list);
        if (!accountId) accountId = picked.accountId;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`GET /customers flow failed: ${msg}`);
    }
  }

  console.log(`Customer: ${customerId ?? '(unknown)'}`);
  console.log(`Account: ${accountId ?? '(unknown)'}`);
  if (assignedAccounts.length) {
    console.log(`Assigned accounts: ${assignedAccounts.length}`);
  }
  if (!accountId) {
    throw new Error(
      `No account id available. Set NESSIE_ACCOUNT_ID or ensure your key has accounts assigned. Tried: ${errors.join(
        ' | ',
      )}`,
    );
  }

  const purchases = await fetchJson<NessiePurchase[]>(
    withKey(`${base}/accounts/${encodeURIComponent(accountId)}/purchases`, key),
  );
  const mapped = (Array.isArray(purchases) ? purchases : [])
    .map((p) =>
      nessiePurchaseToNormalized(
        p as unknown as import('@mosaicledger/connectors').NessiePurchase,
        {
          source: 'nessie',
          accountId,
        },
      ),
    )
    .filter(Boolean);

  console.log(`Account: ${accountId}`);
  console.log(`Purchases: ${Array.isArray(purchases) ? purchases.length : 0}`);
  console.log(`Mapped: ${mapped.length}`);

  for (const t of mapped.slice(0, 5)) {
    console.log(`- ${t.date} $${t.amount.toFixed(2)} ${t.merchant} (${t.category})`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`nessie:probe failed: ${msg}`);
  process.exit(1);
});
