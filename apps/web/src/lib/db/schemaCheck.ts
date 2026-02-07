import 'server-only';

import { hasSupabaseEnv } from '../env';
import { supabaseAdmin } from '../supabase/admin';

export type SchemaStatus = 'ok' | 'warn' | 'fail';

export type SchemaCheckItem = {
  name: string;
  status: SchemaStatus;
  detail: string;
};

type TableSpec = {
  table: string;
  columns: string[];
};

const REQUIRED_TABLES: TableSpec[] = [
  { table: 'user_profiles', columns: ['user_id', 'created_at'] },
  { table: 'plaid_items', columns: ['user_id', 'status', 'updated_at'] },
  { table: 'user_overrides', columns: ['user_id', 'kind', 'key', 'value'] },
  {
    table: 'analysis_runs',
    columns: [
      'user_id',
      'created_at',
      'summary_json',
      'mosaic_json',
      'recurring_json',
      'action_plan_json',
    ],
  },
];

const OPTIONAL_TABLES: Array<TableSpec & { note: string }> = [
  {
    table: 'nessie_customers',
    columns: ['user_id', 'nessie_customer_id', 'nessie_account_id', 'created_at'],
    note: 'Needed for the Capital One Nessie connector (stable per-user binding).',
  },
  {
    table: 'transactions_normalized',
    columns: ['user_id', 'source', 'txn_id', 'date', 'amount', 'merchant_raw', 'merchant'],
    note: 'Needed for the Capital One Nessie connector (cached normalized transactions).',
  },
];

async function checkTable(
  spec: TableSpec,
  opts?: { missingStatus?: SchemaStatus; note?: string },
): Promise<SchemaCheckItem> {
  const cols = spec.columns.join(',');
  try {
    const sb = supabaseAdmin();
    // `head: true` avoids returning any rows; we only want schema existence.
    const { error } = await sb.from(spec.table).select(cols, { head: true }).limit(1);
    if (error) {
      // PostgREST tends to return a structured error for missing relations/columns.
      const code = error.code ?? 'unknown';
      const missingStatus: SchemaStatus = opts?.missingStatus ?? 'fail';
      const note = opts?.note ? ` ${opts.note}` : '';
      return {
        name: `Table: ${spec.table}`,
        status: missingStatus,
        detail: `${
          missingStatus === 'warn'
            ? 'Optional table missing or incompatible.'
            : 'Missing or incompatible.'
        } (expected columns: ${cols}; error: ${code}). Apply supabase/schema.sql.${note}`,
      };
    }
    return {
      name: `Table: ${spec.table}`,
      status: 'ok',
      detail: `Present (columns: ${cols}).`,
    };
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'unknown';
    return {
      name: `Table: ${spec.table}`,
      status: 'fail',
      detail: `Schema check failed (${msg}).`,
    };
  }
}

export async function checkSchema(): Promise<SchemaCheckItem[]> {
  if (!hasSupabaseEnv()) {
    return [
      {
        name: 'Supabase env',
        status: 'warn',
        detail:
          'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (demo is fine).',
      },
    ];
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [
      {
        name: 'Supabase service role',
        status: 'warn',
        detail:
          'Missing SUPABASE_SERVICE_ROLE_KEY; cannot verify DB schema via admin client (demo is fine).',
      },
    ];
  }

  const out: SchemaCheckItem[] = [];
  out.push({ name: 'Supabase env', status: 'ok', detail: 'Configured.' });
  out.push({ name: 'Supabase service role', status: 'ok', detail: 'Configured.' });

  for (const spec of REQUIRED_TABLES) {
    // Run sequentially: keeps Supabase requests small and avoids rate limits.
    out.push(await checkTable(spec));
  }

  for (const spec of OPTIONAL_TABLES) {
    out.push(await checkTable(spec, { missingStatus: 'warn', note: spec.note }));
  }

  return out;
}
