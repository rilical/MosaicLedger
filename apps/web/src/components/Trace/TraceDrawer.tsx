'use client';

import * as React from 'react';
import { Drawer } from '../ui/Drawer';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../ui';

export type ToolTraceStepV1 = {
  id: string;
  name: string;
  at: string; // ISO
  durationMs: number;
  ok: boolean;
  input: unknown;
  output: unknown;
  error?: string;
};

export type ToolTraceV1 = {
  version: 1;
  startedAt: string; // ISO
  totalMs: number;
  steps: ToolTraceStepV1[];
};

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '0ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function TraceDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trace: ToolTraceV1 | null;
}) {
  const { open, onOpenChange, trace } = props;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Tool Trace (Debug)">
      {!trace ? (
        <div className="small">No trace recorded yet. Ask the Coach a question first.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <Card>
            <CardHeader>
              <CardTitle>Run Summary</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <div>Started: {new Date(trace.startedAt).toLocaleString()}</div>
                <div>Total: {formatMs(trace.totalMs)}</div>
                <div>Steps: {trace.steps.length}</div>
              </div>
            </CardBody>
          </Card>

          <div style={{ display: 'grid', gap: 10 }}>
            {trace.steps.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <CardTitle>{s.name}</CardTitle>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge tone={s.ok ? 'good' : 'warn'}>{s.ok ? 'OK' : 'FAIL'}</Badge>
                      <span className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatMs(s.durationMs)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {s.error ? (
                    <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                      {s.error}
                    </div>
                  ) : null}
                  <details style={{ marginTop: 8 }}>
                    <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Redacted input/output
                    </summary>
                    <pre
                      className="small"
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(
                        {
                          input: s.input,
                          output: s.output,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
