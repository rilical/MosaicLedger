'use client';

import * as React from 'react';
import type { OpsBrief } from '@mosaicledger/contracts';
import { Button, Card, CardBody, CardHeader, CardTitle, Badge } from '../ui';

type OpsMemoResponse =
  | { ok: true; memoText: string; usedAI: boolean; error?: string }
  | { ok: false; error?: string };

export function OpsMemoPanel(props: {
  briefs: OpsBrief[];
  range: { start: string; end: string };
  aiEnabled: boolean;
}) {
  const { briefs, range, aiEnabled } = props;
  const [status, setStatus] = React.useState<'idle' | 'loading'>('idle');
  const [memo, setMemo] = React.useState<string>('');
  const [usedAI, setUsedAI] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [useAI, setUseAI] = React.useState<boolean>(aiEnabled);

  async function run(style: 'friendly' | 'concise') {
    setStatus('loading');
    setError(null);
    try {
      const resp = await fetch('/api/ops/memo', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(useAI ? { 'x-ml-force-ai': '1' } : {}),
        },
        body: JSON.stringify({ briefs, range, style }),
      });
      const json = (await resp.json()) as OpsMemoResponse;
      if (!resp.ok || !json.ok) {
        throw new Error(('error' in json ? json.error : null) ?? 'memo failed');
      }
      setMemo(json.memoText);
      setUsedAI(Boolean(json.usedAI));
      setError(json.error ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'memo failed');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ops Memo</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="buttonRow" style={{ justifyContent: 'space-between' }}>
          <div className="buttonRow">
            <Button
              variant="primary"
              onClick={() => void run('friendly')}
              disabled={status === 'loading' || briefs.length === 0}
            >
              {status === 'loading'
                ? 'Generating…'
                : useAI
                  ? 'Generate Ops Memo (AI)'
                  : 'Generate Ops Memo'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void run('concise')}
              disabled={status === 'loading' || briefs.length === 0}
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
          </div>
          <div className="buttonRow">
            <Badge tone={useAI ? 'neutral' : 'good'}>{useAI ? 'AI on' : 'AI off'}</Badge>
            {memo ? (
              useAI && !usedAI ? (
                <Badge tone="warn">AI unavailable</Badge>
              ) : (
                <Badge tone={usedAI ? 'warn' : 'neutral'}>
                  {usedAI ? 'AI rewrite' : 'Deterministic'}
                </Badge>
              )
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="small" style={{ marginTop: 10, color: 'rgba(234,179,8,0.95)' }}>
            {error}
          </div>
        ) : null}

        <textarea
          className="input"
          readOnly
          value={memo}
          placeholder="Generate a memo from deterministic briefs."
          style={{
            marginTop: 12,
            minHeight: 220,
            width: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
          }}
        />
      </CardBody>
    </Card>
  );
}
