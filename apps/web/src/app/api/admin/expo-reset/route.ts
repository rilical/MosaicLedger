import { NextResponse } from 'next/server';
import { parseBooleanEnv, hasSupabaseEnv } from '../../../../lib/env';
import { supabaseServer } from '../../../../lib/supabase/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export async function POST() {
  const enabled = parseBooleanEnv(process.env.EXPO_RESET_ENABLED, false);
  if (!enabled) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, cleared: false, detail: 'supabase not configured' });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admin = supabaseAdmin();
    await admin.from('analysis_runs').delete().eq('user_id', user.id);
  } catch {
    // Non-blocking: reset is a demo convenience, not core functionality.
  }

  return NextResponse.json({ ok: true, cleared: true });
}
