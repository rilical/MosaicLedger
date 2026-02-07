'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { useFlags } from '../../lib/flags-client';
import type { AnalysisSettings } from '../../components/Analysis/types';

export default function ConnectPage() {
  const router = useRouter();
  const { flags } = useFlags();
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

  const canUseNessie = flags.nessieEnabled;

  const connectNessie = React.useCallback(async () => {
    setNessieStep('bootstrapping');
    setNessieError(null);
    try {
      const resp = await fetch('/api/nessie/bootstrap', { method: 'POST' });
      const json = (await resp.json()) as
        | { ok: true; customerId?: string; accountId?: string; mode?: string }
        | { ok: false; error?: string };
      if (!resp.ok || !json.ok) {
        throw new Error(('error' in json ? json.error : null) ?? 'Nessie bootstrap failed');
      }

      // Best-effort sync: if Supabase/auth are configured, persist purchases to avoid repeated sponsor calls.
      // If sync fails (common in judge/demo deployments), we still proceed with live Nessie fetch.
      if (json.mode !== 'env_noauth') {
        try {
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
          if (syncResp.ok && syncJson.ok && (syncJson.counts?.purchases ?? 0) === 0) {
            try {
              await fetch('/api/nessie/simulate-week', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  customerId: json.customerId,
                  accountId: json.accountId,
                }),
              });
              await fetch('/api/nessie/sync', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  customerId: json.customerId,
                  accountId: json.accountId,
                }),
              });
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore (still proceed to live fetch)
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
      patchAnalysisSettings({ source: 'demo' });
      router.push('/app/mosaic?source=demo');
    } finally {
      setNessieStep('idle');
    }
  }, [router]);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
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
              Demo data is the always-works path (and the deterministic engine is tested against it
              in CI). Sponsor connectors are optional and intentionally fail fast to keep the demo
              smooth.
            </div>

            {nessieError ? (
              <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                Nessie: {nessieError} (fell back to demo data)
              </div>
            ) : null}

            <div className="choiceGrid">
              <div className="choiceCard">
                <div className="choiceHeader">
                  <div>
                    <div className="choiceTitle">Demo Data</div>
                    <div className="small">Always works. Best path for judges.</div>
                  </div>
                  <Badge tone="good">Recommended</Badge>
                </div>
                <div className="buttonRow">
                  <Button
                    variant="primary"
                    onClick={() => {
                      patchAnalysisSettings({ source: 'demo' });
                      router.push('/app/mosaic?source=demo');
                    }}
                  >
                    Start Demo
                  </Button>
                  <Button onClick={() => router.push('/app/export?privacy=1')}>Export Poster</Button>
                </div>
              </div>

              <div className="choiceCard">
                <div className="choiceHeader">
                  <div>
                    <div className="choiceTitle">Plaid (Sandbox)</div>
                    <div className="small">Optional live-ish bank linking via Plaid Link.</div>
                  </div>
                  <Badge tone={flags.plaidEnabled ? 'neutral' : 'warn'}>
                    {flags.plaidEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="buttonRow">
                  <Button
                    variant="primary"
                    disabled={!flags.plaidEnabled}
                    onClick={() => router.push('/app/bank')}
                  >
                    Connect Bank
                  </Button>
                  <Button onClick={() => router.push('/app/mosaic?source=demo')}>Use Demo</Button>
                </div>
                {!flags.plaidEnabled ? (
                  <div className="small" style={{ marginTop: 10 }}>
                    Toggle in Settings or set `NEXT_PUBLIC_PLAID_ENABLED=1`.
                  </div>
                ) : null}
              </div>

              <div className="choiceCard">
                <div className="choiceHeader">
                  <div>
                    <div className="choiceTitle">Capital One Nessie</div>
                    <div className="small">Sponsor connector. Pulls purchases into the same engine.</div>
                  </div>
                  <Badge tone={canUseNessie ? 'neutral' : 'warn'}>
                    {canUseNessie ? 'Ready' : 'Needs setup'}
                  </Badge>
                </div>
                <div className="buttonRow">
                  <Button
                    variant="primary"
                    disabled={!canUseNessie || nessieStep !== 'idle'}
                    onClick={() => void connectNessie()}
                  >
                    {nessieStep === 'bootstrapping'
                      ? 'Connecting…'
                      : nessieStep === 'syncing'
                        ? 'Syncing…'
                        : 'Connect Nessie'}
                  </Button>
                  <Button onClick={() => router.push('/app/settings')}>Settings</Button>
                </div>
                {!flags.nessieEnabled ? (
                  <div className="small" style={{ marginTop: 10 }}>
                    Toggle in Settings or set `NEXT_PUBLIC_NESSIE_ENABLED=1`.
                  </div>
                ) : null}
              </div>

              <div className="choiceCard">
                <div className="choiceHeader">
                  <div>
                    <div className="choiceTitle">15KB Minesweeper</div>
                    <div className="small">Tiny static side quest. First click is safe.</div>
                  </div>
                  <Badge tone="neutral">Game</Badge>
                </div>
                <div className="buttonRow">
                  <Button variant="primary" onClick={() => router.push('/game')}>
                    Play Minesweeper
                  </Button>
                  <Button onClick={() => router.push('/mosaic-game')}>Mosaic Sprint</Button>
                </div>
              </div>
            </div>

            <div className="buttonRow" style={{ alignItems: 'center' }}>
              {flags.demoMode ? <Badge tone="good">Demo Mode ON</Badge> : <Badge>Demo OFF</Badge>}
              {flags.judgeMode ? <Badge tone="warn">Judge Mode ON</Badge> : null}
            </div>
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
