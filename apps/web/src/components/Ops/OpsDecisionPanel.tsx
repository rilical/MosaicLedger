'use client';

import * as React from 'react';
import type { OpsDashboard } from '../../lib/ops/dashboard';
import type { OpsFinding } from '@mosaicledger/contracts';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../ui';
import { MarkdownLite } from '../MarkdownLite';

type OpsDecisionResponse =
  | { ok: true; text: string; usedAI: boolean; error?: string }
  | { ok: false; error?: string };

export function OpsDecisionPanel(props: {
  dashboard: OpsDashboard;
  findings: OpsFinding[];
  range: { start: string; end: string };
  aiEnabled: boolean;
  capitalOneSignals?: { billsUpcoming30dCount: number } | null;
}) {
  const { dashboard, findings, range, aiEnabled, capitalOneSignals } = props;
  const [status, setStatus] = React.useState<'idle' | 'loading'>('idle');
  const [text, setText] = React.useState<string>('');
  const [usedAI, setUsedAI] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [useAI, setUseAI] = React.useState<boolean>(aiEnabled);
  const [view, setView] = React.useState<'formatted' | 'raw'>('formatted');

  async function run(style: 'exec' | 'concise') {
    setStatus('loading');
    setError(null);
    try {
      const top = findings.slice(0, 10);
      const resp = await fetch('/api/ops/decision', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(useAI ? { 'x-ml-force-ai': '1' } : {}),
        },
        body: JSON.stringify({
          dashboard,
          range,
          capitalOneSignals: capitalOneSignals ?? undefined,
          topFindings: top.map((f) => ({
            analyst: f.analyst,
            kind: f.kind,
            severity: f.severity,
            metrics: f.metrics,
            entities: f.entities,
            why: f.why,
          })),
          style,
        }),
      });
      const json = (await resp.json()) as OpsDecisionResponse;
      if (!resp.ok || !json.ok) throw new Error(('error' in json ? json.error : null) ?? 'failed');
      setText(json.text);
      setUsedAI(Boolean(json.usedAI));
      setError(json.error ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision Support (BNY Back-Office)</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="buttonRow" style={{ justifyContent: 'space-between' }}>
          <div className="buttonRow">
            <Button
              variant="primary"
              onClick={() => void run('exec')}
              disabled={status === 'loading' || findings.length === 0}
            >
              {status === 'loading'
                ? 'Generating…'
                : useAI
                  ? 'Generate Decision Brief (AI)'
                  : 'Generate Decision Brief'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void run('concise')}
              disabled={status === 'loading' || findings.length === 0}
            >
              Concise
            </Button>
            <Button
              variant={useAI ? 'primary' : 'ghost'}
              onClick={() => setUseAI((v) => !v)}
              disabled={status === 'loading'}
            >
              AI: {useAI ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant={view === 'formatted' ? 'primary' : 'ghost'}
              onClick={() => setView((v) => (v === 'formatted' ? 'raw' : 'formatted'))}
              disabled={!text}
            >
              {view === 'formatted' ? 'Formatted' : 'Raw'}
            </Button>
          </div>
          <div className="buttonRow">
            <Badge tone={useAI ? 'neutral' : 'good'}>{useAI ? 'AI on' : 'AI off'}</Badge>
            {text ? (
              useAI && !usedAI ? (
                <Badge tone="warn">AI unavailable</Badge>
              ) : (
                <Badge tone={usedAI ? 'warn' : 'neutral'}>
                  {usedAI ? 'AI narrative' : 'Deterministic'}
                </Badge>
              )
            ) : null}
          </div>
        </div>

        <div className="small" style={{ marginTop: 10 }}>
          This turns risk/compliance/recon signals into concrete back-office decisions: what to
          review, what to reconcile, and what to escalate. AI is optional and must not invent
          numbers.
          {capitalOneSignals ? (
            <div style={{ marginTop: 8 }}>
              Capital One signals: <b>{capitalOneSignals.billsUpcoming30dCount}</b> bills due in the
              next 30 days.
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="small" style={{ marginTop: 10, color: 'rgba(234,179,8,0.95)' }}>
            {error}
          </div>
        ) : null}

        {view === 'raw' ? (
          <textarea
            className="input"
            readOnly
            value={text}
            placeholder="Generate a decision brief from deterministic ops metrics."
            style={{
              marginTop: 12,
              minHeight: 240,
              width: '100%',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
            }}
          />
        ) : (
          <div
            className="input"
            style={{
              marginTop: 12,
              minHeight: 240,
              width: '100%',
              padding: 14,
              borderRadius: 16,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {text ? (
              <MarkdownLite text={text} />
            ) : (
              <div className="small" style={{ opacity: 0.85 }}>
                Generate a decision brief from deterministic ops metrics.
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
