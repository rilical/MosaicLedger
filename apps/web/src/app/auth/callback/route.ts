import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Default to app shell; `next` can be added later.
  url.pathname = next && next.startsWith('/') ? next : '/app';
  url.search = '';
  return NextResponse.redirect(url);
}
