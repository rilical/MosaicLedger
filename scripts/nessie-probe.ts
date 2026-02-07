import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nessiePurchaseToNormalized } from '@mosaicledger/connectors';

type NessieCustomer = { _id?: unknown; id?: unknown; first_name?: unknown; last_name?: unknown };
type NessieAccount = { _id?: unknown; id?: unknown; nickname?: unknown; type?: unknown };
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

function withKey(url: string, key: string): string {
  const qp = `key=${encodeURIComponent(key)}`;
  return url.includes('?') ? `${url}&${qp}` : `${url}?${qp}`;
}

async function main(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '..');
  loadDotEnvFile(path.join(repoRoot, 'apps/web/.env.local'));
  loadDotEnvFile(path.join(repoRoot, 'apps/web/.env'));

  const key = envOrThrow('NESSIE_API_KEY');
  const base = baseUrl();

  const customers = await fetchJson<NessieCustomer[]>(withKey(`${base}/customers`, key));
  const customerId =
    (process.env.NESSIE_CUSTOMER_ID?.trim() || null) ?? readId(customers[0]) ?? null;

  console.log(`Nessie base: ${base}`);
  console.log(`Customers: ${Array.isArray(customers) ? customers.length : 0}`);
  if (!customerId) {
    console.log('No customer id available (set NESSIE_CUSTOMER_ID to probe accounts).');
    return;
  }

  const accounts = await fetchJson<NessieAccount[]>(
    withKey(`${base}/customers/${encodeURIComponent(customerId)}/accounts`, key),
  );
  const accountId = (process.env.NESSIE_ACCOUNT_ID?.trim() || null) ?? readId(accounts[0]) ?? null;

  console.log(`Customer: ${customerId}`);
  console.log(`Accounts: ${Array.isArray(accounts) ? accounts.length : 0}`);
  if (!accountId) {
    console.log('No account id available (set NESSIE_ACCOUNT_ID to probe purchases).');
    return;
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
