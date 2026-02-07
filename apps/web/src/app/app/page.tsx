'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { useFlags } from '../../lib/flags-client';
import type { AnalysisSettings } from '../../components/Analysis/types';

export default function ConnectPage() {
  const router = useRouter();
  const { flags, setFlag } = useFlags();
  const [nessieStep, setNessieStep] = React.useState<'idle' | 'bootstrapping' | 'syncing'>('idle');
  const [nessieError, setNessieError] = React.useState<string | null>(null);

  function patchAnalysisSettings(patch: Partial<AnalysisSettings>) {
    try {
      const key = 'mosaicledger.analysisSettings.v1';
      const raw = window.localStorage.getItem(key);
      const base = raw ? (JSON.parse(raw) as unknown) : {};
      const obj = base && typeof base === 'object' ? (base as Record<string, unknown>) : {};
      window.localStorage.setItem(key, JSON.stringify({ ...obj, ...patch }));
    } catch {
      // non-blocking
    }
  }

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Connect</h1>
        <div className="pageMeta">
          <div className="pageTagline">Pick a data source to start the demo flow.</div>
          <Badge tone="good">Demo-first</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Choose a Data Source</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="small">
              Bank sync is optional and may fail live. Demo data is the always-works path and is
              what the deterministic engine is tested against in CI.
            </div>

            <div className="buttonRow">
              <Button
                variant="primary"
                disabled={!flags.plaidEnabled}
                onClick={() => router.push('/app/bank')}
              >
                Connect Bank (Plaid)
              </Button>

              <Button
                onClick={() => {
                  patchAnalysisSettings({ source: 'demo' });
                  router.push('/app/mosaic?source=demo');
                }}
              >
                Use Demo Data
              </Button>

              <Button
                disabled={!flags.nessieEnabled || nessieStep !== 'idle'}
                onClick={async () => {
                  setNessieStep('bootstrapping');
                  setNessieError(null);
                  try {
                    const resp = await fetch('/api/nessie/bootstrap', { method: 'POST' });
                    const json = (await resp.json()) as
                      | { ok: true; customerId?: string; accountId?: string }
                      | { ok: false; error?: string };
                    if (!resp.ok || !json.ok) {
                      throw new Error(
                        ('error' in json ? json.error : null) ?? 'Nessie bootstrap failed',
                      );
                    }

                    // Pull accounts + purchases and persist into `transactions_normalized`
                    // so the engine can re-run without sponsor network calls.
                    setNessieStep('syncing');
                    const syncResp = await fetch('/api/nessie/sync', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        customerId: json.customerId,
                        accountId: json.accountId,
                      }),
                    });
                    const syncJson = (await syncResp.json()) as
                      | { ok: true; counts?: { purchases?: number } }
                      | { ok: false; error?: string };
                    if (!syncResp.ok || !syncJson.ok) {
                      throw new Error(
                        ('error' in syncJson ? syncJson.error : null) ?? 'Nessie sync failed',
                      );
                    }

                    // If the account has no purchases yet, simulate a week of activity so the Mosaic isn't empty.
                    if (syncJson.counts?.purchases === 0) {
                      try {
                        await fetch('/api/nessie/simulate-week', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({
                            customerId: json.customerId,
                            accountId: json.accountId,
                          }),
                        });
                      } catch {
                        // ignore; demo-safe fallback will still work
                      }

                      const syncResp2 = await fetch('/api/nessie/sync', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          customerId: json.customerId,
                          accountId: json.accountId,
                        }),
                      });
                      const syncJson2 = (await syncResp2.json()) as
                        | { ok: true }
                        | { ok: false; error?: string };
                      if (!syncResp2.ok || !syncJson2.ok) {
                        throw new Error(
                          ('error' in syncJson2 ? syncJson2.error : null) ??
                            'Nessie sync failed after simulation',
                        );
                      }
                    }

                    patchAnalysisSettings({
                      source: 'nessie',
                      nessieCustomerId: json.customerId,
                      nessieAccountId: json.accountId,
                    });
                    router.push('/app/mosaic?source=nessie');
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Nessie bootstrap failed';
                    setNessieError(msg);
                    // Demo-safe fallback: force the always-works path.
                    setFlag('demoMode', true);
                    setFlag('judgeMode', true);
                    patchAnalysisSettings({ source: 'demo' });
                    router.push('/app/mosaic?source=demo');
                  } finally {
                    setNessieStep('idle');
                  }
                }}
              >
                {nessieStep === 'bootstrapping'
                  ? 'Connecting…'
                  : nessieStep === 'syncing'
                    ? 'Syncing…'
                    : 'Connect Capital One Nessie'}
              </Button>

              {flags.demoMode ? (
                <Badge tone="good">Demo Mode default ON</Badge>
              ) : (
                <Badge>Demo OFF</Badge>
              )}
              {flags.judgeMode ? <Badge tone="warn">Judge Mode ON</Badge> : null}
            </div>

            {nessieError ? (
              <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                Nessie: {nessieError} (fell back to demo data)
              </div>
            ) : null}

            {!flags.plaidEnabled ? (
              <div className="small">
                Plaid is currently disabled. Toggle it in Settings or set
                `NEXT_PUBLIC_PLAID_ENABLED=1`.
              </div>
            ) : null}
            {!flags.nessieEnabled ? (
              <div className="small">
                Nessie is currently disabled. Toggle it in Settings or set
                `NEXT_PUBLIC_NESSIE_ENABLED=1`.
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What You Get</CardTitle>
        </CardHeader>
        <CardBody>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            <li>Mosaic mural (treemap) as primary navigation surface</li>
            <li>Recurring detection with predicted next charges</li>
            <li>Ranked action plan with quantified monthly savings</li>
            <li>Deterministic core engine (AI never required)</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
