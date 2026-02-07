import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next');

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'magiclink' | 'recovery',
    });
    if (error) {
      const failUrl = new URL('/login', request.url);
      failUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(failUrl);
    }
  }

  const target = new URL(request.url);
  target.pathname = next && next.startsWith('/') ? next : '/app';
  target.search = '';
  return NextResponse.redirect(target);
}
