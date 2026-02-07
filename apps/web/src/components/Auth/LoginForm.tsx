'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabase/browser';
import { Button } from '../ui';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setError(err);
      setStatus('error');
    }
  }, [searchParams]);

  function errorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    return 'Failed to send magic link.';
  }

  async function onSend() {
    setStatus('sending');
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const next = searchParams.get('next') ?? '/app';
      const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? window.location.origin;
      const redirectTo = new URL('/auth/callback', origin);
      redirectTo.searchParams.set('next', next);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo.toString() },
      });

      if (signInError) throw signInError;
      setStatus('sent');
    } catch (e: unknown) {
      setStatus('error');
      setError(errorMessage(e));
    } finally {
      // light client-side rate limit
      setTimeout(() => {
        setStatus((s) => (s === 'sending' ? 'idle' : s));
      }, 1200);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Email</div>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          autoComplete="email"
        />
      </div>

      <div className="buttonRow">
        <Button
          variant="primary"
          type="button"
          onClick={onSend}
          disabled={status === 'sending' || !email.includes('@')}
        >
          {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Send magic link'}
        </Button>
      </div>

      {status === 'sent' ? (
        <div className="small">
          Check your email for the magic link. You can close this tab after signing in.
        </div>
      ) : null}

      {status === 'error' && error ? (
        <div className="small" style={{ color: 'rgba(244, 63, 94, 0.95)' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
