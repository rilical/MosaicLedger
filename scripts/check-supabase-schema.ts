import { createClient } from '@supabase/supabase-js';

type TableSpec = { table: string; columns: string[] };

const REQUIRED: TableSpec[] = [
  { table: 'user_profiles', columns: ['user_id', 'created_at'] },
  { table: 'plaid_items', columns: ['user_id', 'status', 'updated_at', 'transactions_cursor'] },
  {
    table: 'plaid_transactions',
    columns: ['user_id', 'transaction_id', 'date', 'amount', 'deleted'],
  },
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

function mustGet(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

async function main() {
  const url = mustGet('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = mustGet('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRole) {
    console.log(
      'check-supabase-schema: skipping (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).',
    );
    process.exit(0);
  }

  const sb = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = true;
  for (const spec of REQUIRED) {
    const cols = spec.columns.join(',');
    const { error } = await sb.from(spec.table).select(cols, { head: true }).limit(1);
    if (error) {
      ok = false;
      console.error(
        `FAIL ${spec.table}: expected columns ${cols} (error ${error.code ?? 'unknown'})`,
      );
    } else {
      console.log(`OK   ${spec.table} (${cols})`);
    }
  }

  if (!ok) {
    console.error('Schema check failed. Apply supabase/schema.sql and re-run.');
    process.exit(1);
  }

  console.log('Schema check OK.');
}

main().catch((e) => {
  console.error('Schema check failed:', e);
  process.exit(1);
});
