import 'server-only';

export type NessieMode = 'readwrite' | 'readonly';

export type NessieError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type NessieOk<T> = { ok: true; data: T };
export type NessieResult<T> = NessieOk<T> | NessieError;

function getBaseUrl(): string {
  return (process.env.NESSIE_BASE_URL ?? 'https://api.nessieisreal.com').replace(/\/+$/, '');
}

function hasKey(): boolean {
  return Boolean(process.env.NESSIE_API_KEY);
}

function keyQuery(): string {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error('Missing NESSIE_API_KEY');
  return `key=${encodeURIComponent(key)}`;
}

function withKey(url: string): string {
  return url.includes('?') ? `${url}&${keyQuery()}` : `${url}?${keyQuery()}`;
}

async function readJson(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function normalizeError(status: number, body: unknown): NessieError {
  const msg =
    body && typeof body === 'object' && 'message' in body
      ? String((body as Record<string, unknown>).message)
      : '';

  const code =
    status === 401
      ? 'unauthorized'
      : status === 403
        ? 'forbidden'
        : status === 404
          ? 'not_found'
          : status >= 500
            ? 'server_error'
            : 'request_failed';

  return {
    ok: false,
    status,
    code,
    message: msg || `Nessie request failed (${status})`,
  };
}

async function nessieFetch<T>(path: string, init?: RequestInit): Promise<NessieResult<T>> {
  const controller = new AbortController();
  const timeoutMs = 3500; // demo-safe: never hang on a sponsor API
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = withKey(`${getBaseUrl()}${path}`);
    const resp = await fetch(url, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    const body = await readJson(resp);
    if (!resp.ok) return normalizeError(resp.status, body);
    return { ok: true, data: body as T };
  } catch (e: unknown) {
    const aborted =
      e &&
      typeof e === 'object' &&
      'name' in e &&
      String((e as { name?: unknown }).name) === 'AbortError';
    return {
      ok: false,
      status: 0,
      code: aborted ? 'timeout' : 'network_error',
      message: aborted ? 'Nessie request timed out' : 'Nessie network error',
    };
  } finally {
    clearTimeout(t);
  }
}

export type NessieCustomer = {
  _id: string;
  first_name?: string;
  last_name?: string;
};

export type NessieAccount = {
  _id: string;
  type?: string;
  nickname?: string;
  balance?: number;
  customer_id?: string;
};

export type NessiePurchase = {
  _id: string;
  amount: number;
  description?: string;
  purchase_date?: string; // YYYY-MM-DD
  status?: string;
  type?: string;
};

export function hasNessieEnv(): boolean {
  return hasKey();
}

export function getNessieBaseUrl(): string {
  return getBaseUrl();
}

export function nessieServerClient(): {
  getCustomers: () => Promise<NessieResult<NessieCustomer[]>>;
  createCustomer: (
    payload: Record<string, unknown>,
  ) => Promise<NessieResult<Record<string, unknown>>>;
  getAccountsByCustomer: (customerId: string) => Promise<NessieResult<NessieAccount[]>>;
  createAccount: (
    customerId: string,
    payload: Record<string, unknown>,
  ) => Promise<NessieResult<Record<string, unknown>>>;
  getPurchases: (accountId: string) => Promise<NessieResult<NessiePurchase[]>>;
  createPurchase: (
    accountId: string,
    payload: Record<string, unknown>,
  ) => Promise<NessieResult<Record<string, unknown>>>;
} {
  return {
    getCustomers: () => nessieFetch('/customers'),
    createCustomer: (payload) =>
      nessieFetch('/customers', { method: 'POST', body: JSON.stringify(payload) }),
    getAccountsByCustomer: (customerId) =>
      nessieFetch(`/customers/${encodeURIComponent(customerId)}/accounts`),
    createAccount: (customerId, payload) =>
      nessieFetch(`/customers/${encodeURIComponent(customerId)}/accounts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getPurchases: (accountId) =>
      nessieFetch(`/accounts/${encodeURIComponent(accountId)}/purchases`),
    createPurchase: (accountId, payload) =>
      nessieFetch(`/accounts/${encodeURIComponent(accountId)}/purchases`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };
}
