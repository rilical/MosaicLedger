import 'server-only';

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

type PlaidEnv = 'sandbox' | 'development' | 'production';

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function hasPlaidEnv(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET && process.env.PLAID_ENV);
}

export function plaidServerClient(): PlaidApi {
  const env = (process.env.PLAID_ENV ?? 'sandbox') as PlaidEnv;

  const cfg = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': mustGet('PLAID_CLIENT_ID'),
        'PLAID-SECRET': mustGet('PLAID_SECRET'),
      },
    },
  });

  return new PlaidApi(cfg);
}
