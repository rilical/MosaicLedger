'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import { Button, Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

type Step = 'idle' | 'fetching_token' | 'link_ready' | 'exchanging' | 'done' | 'error';
type LinkMode = 'plaid' | 'fixture';

export default function BankConnectPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('idle');
  const [linkToken, setLinkToken] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<LinkMode>('plaid');

  // 1. Fetch a link token from our API.
  const fetchLinkToken = React.useCallback(async () => {
    setStep('fetching_token');
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/plaid/link-token', { method: 'POST' });
      const json = (await resp.json()) as
        | { ok: true; mode: LinkMode; linkToken?: string }
        | { ok: false; error?: string };
      if (!resp.ok || !json.ok) {
        throw new Error(('error' in json ? json.error : null) ?? 'Failed to create link token');
      }

      setMode(json.mode);
      if (json.mode === 'fixture') {
        // Demo-safe: no Plaid Link required.
        setLinkToken(null);
        setStep('link_ready');
        return;
      }

      if (!json.linkToken) throw new Error('Missing link token');
      setLinkToken(json.linkToken);
      setStep('link_ready');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to create link token');
      setStep('error');
    }
  }, []);

  const simulateLink = React.useCallback(async () => {
    setStep('exchanging');
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publicToken: 'fixture-public-token' }),
      });
      const json = (await resp.json()) as { ok: boolean; error?: string };
      if (!resp.ok || !json.ok) throw new Error(json.error ?? 'Simulated link failed');
      setStep('done');
      setTimeout(() => router.push('/app/mosaic'), 900);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Simulated link failed');
      setStep('error');
    }
  }, [router]);

  // 2. Plaid Link hook.
  const { open, ready } = usePlaidLink({
    token: mode === 'plaid' ? linkToken : null,
    onSuccess: async (publicToken) => {
      setStep('exchanging');
      try {
        const resp = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ publicToken }),
        });
        const text = await resp.text();
        let json: { ok?: boolean; error?: string };
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          throw new Error(`Server returned non-JSON response (${resp.status})`);
        }
        if (!resp.ok || !json.ok) {
          throw new Error(json.error ?? 'Token exchange failed');
        }
        setStep('done');
        // Navigate to Mosaic after a brief pause so the user sees success.
        setTimeout(() => router.push('/app/mosaic'), 1200);
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Token exchange failed');
        setStep('error');
      }
    },
    onExit: (err) => {
      if (err) {
        setErrorMsg(err.display_message ?? err.error_message ?? 'Plaid Link closed with error');
        setStep('error');
      } else {
        // User closed without completing — reset to idle.
        setStep('idle');
      }
    },
  });

  // Auto-open Plaid Link once the token is ready.
  React.useEffect(() => {
    if (step !== 'link_ready') return;
    if (mode === 'fixture') {
      void simulateLink();
      return;
    }
    if (ready) open();
  }, [step, ready, open, mode, simulateLink]);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Connect Bank</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            Link your bank account via Plaid to import real transactions.
          </div>
          <Badge tone="good">Sandbox</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Connection</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 14 }}>
            {step === 'idle' && (
              <>
                <div className="small">
                  Click the button below to open Plaid Link. In sandbox mode, use the test
                  credentials: <strong>user_good</strong> / <strong>pass_good</strong>.
                </div>
                <div className="buttonRow">
                  <Button variant="primary" onClick={fetchLinkToken}>
                    Connect Bank Account
                  </Button>
                  <Button onClick={() => router.push('/app/mosaic?source=demo')}>
                    Use Demo Data Instead
                  </Button>
                </div>
              </>
            )}

            {step === 'fetching_token' && <div className="small">Preparing Plaid Link&hellip;</div>}

            {step === 'link_ready' && <div className="small">Opening Plaid Link&hellip;</div>}

            {step === 'exchanging' && <div className="small">Linking your account&hellip;</div>}

            {step === 'done' && (
              <div className="small" style={{ color: 'rgba(34,197,94,0.95)' }}>
                Bank linked successfully! Redirecting to Mosaic&hellip;
              </div>
            )}

            {step === 'error' && (
              <>
                <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                  {errorMsg ?? 'Something went wrong.'}
                </div>
                <div className="buttonRow">
                  <Button variant="primary" onClick={fetchLinkToken}>
                    Try Again
                  </Button>
                  <Button onClick={() => router.push('/app/mosaic?source=demo')}>
                    Use Demo Data Instead
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardBody>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            <li>
              Click &ldquo;Connect Bank Account&rdquo; to open Plaid&rsquo;s secure Link modal
            </li>
            <li>Select your bank and sign in (sandbox: user_good / pass_good)</li>
            <li>We exchange the token and store a secure connection</li>
            <li>Your transactions feed into the Mosaic analysis engine</li>
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
