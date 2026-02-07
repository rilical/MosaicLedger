import 'server-only';

import { hasSupabaseEnv } from '../env';
import { supabaseAdmin } from '../supabase/admin';
import { hasPlaidEnv } from './serverClient';

export async function getPlaidLastSync(): Promise<{
  status: 'ok' | 'warn';
  detail: string;
  lastSyncAt: string | null;
}> {
  if (!hasPlaidEnv()) {
    return { status: 'warn', detail: 'Plaid env missing (demo is fine).', lastSyncAt: null };
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 'warn',
      detail: 'Supabase service role not configured; cannot query last sync timestamp.',
      lastSyncAt: null,
    };
  }

  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('plaid_items')
      .select('updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      return {
        status: 'warn',
        detail: `Could not query plaid_items.updated_at (apply supabase/schema.sql).`,
        lastSyncAt: null,
      };
    }

    const lastSyncAt = (data?.[0] as { updated_at?: unknown } | undefined)?.updated_at;
    return {
      status: 'ok',
      detail: lastSyncAt ? `Last sync: ${String(lastSyncAt)}.` : 'No sync recorded yet.',
      lastSyncAt: lastSyncAt ? String(lastSyncAt) : null,
    };
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'unknown';
    return { status: 'warn', detail: `Failed to query last sync (${msg}).`, lastSyncAt: null };
  }
}
