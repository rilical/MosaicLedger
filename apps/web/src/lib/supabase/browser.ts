'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './shared';

let _client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;
  const { url, anonKey } = getSupabaseEnv();
  _client = createBrowserClient(url, anonKey);
  return _client;
}
