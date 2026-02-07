'use client';

import * as React from 'react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { TraceDrawer, type ToolTraceV1 } from '../../../components/Trace/TraceDrawer';

type CoachMode = 'advice' | 'whatif' | 'poster_audit';

type CoachRunResponse =
  | {
      ok: true;
      answer: string;
      coordinatorJson: unknown;
      modelsUsed: string[];
      toolsCalled: string[];
      mcpServers: string[];
      trace: ToolTraceV1;
      vision?: unknown;
      usedDedalus: boolean;
    }
  | { ok: false; error?: string };

export default function CoachPage() {
  const [mode, setMode] = React.useState<CoachMode>('advice');
  const [question, setQuestion] = React.useState(
    'What are my top 3 savings actions this month, and why?',
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [modelsUsed, setModelsUsed] = React.useState<string[]>([]);
  const [toolsCalled, setToolsCalled] = React.useState<string[]>([]);
  const [mcpServers, setMcpServers] = React.useState<string[]>([]);
  const [usedDedalus, setUsedDedalus] = React.useState<boolean>(false);
  const [trace, setTrace] = React.useState<ToolTraceV1 | null>(null);
  const [traceOpen, setTraceOpen] = React.useState(false);

  const run = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setAnswer(null);
    setModelsUsed([]);
    setToolsCalled([]);
    setMcpServers([]);
    setUsedDedalus(false);
    setTrace(null);

    try {
      const resp = await fetch('/api/coach/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: question, mode }),
      });

      const json = (await resp.json()) as CoachRunResponse;
      if (!resp.ok || !json.ok) {
        throw new Error(('error' in json ? json.error : null) ?? `Coach failed (${resp.status})`);
      }

      setAnswer(json.answer);
      setModelsUsed(json.modelsUsed ?? []);
      setToolsCalled(json.toolsCalled ?? []);
      setMcpServers(json.mcpServers ?? []);
      setUsedDedalus(Boolean(json.usedDedalus));
      setTrace(json.trace ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Coach failed');
    } finally {
      setBusy(false);
    }
  }, [mode, question]);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Coach</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            Tool-calling agent: deterministic engine decides, AI narrates (optional).
          </div>
          <Badge tone={busy ? 'warn' : error ? 'warn' : 'good'}>
            {busy ? 'Busy' : error ? 'Error' : 'Ready'}
          </Badge>
          <Badge tone={usedDedalus ? 'neutral' : 'warn'}>
            {usedDedalus ? 'Dedalus ON' : 'Dedalus OFF'}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask MosaicCoach</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="small" style={{ opacity: 0.92 }}>
              Disclaimer: This is not financial advice. Numbers come from deterministic tools over
              your selected dataset (demo by default).
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label className="small" style={{ display: 'grid', gap: 4 }}>
                Mode
                <select
                  className="input select"
                  style={{ paddingTop: 8, paddingBottom: 8, minWidth: 240 }}
                  value={mode}
                  onChange={(e) => setMode(e.target.value as CoachMode)}
                >
                  <option value="advice">Advice</option>
                  <option value="whatif">What-if</option>
                  <option value="poster_audit">Poster audit (vision)</option>
                </select>
              </label>

              <div style={{ flex: 1 }} />
              <Button
                variant="primary"
                disabled={busy || !question.trim()}
                onClick={() => void run()}
              >
                {busy ? 'Running…' : 'Run'}
              </Button>
              <Button variant="ghost" disabled={!trace} onClick={() => setTraceOpen(true)}>
                View tool trace
              </Button>
            </div>

            <textarea
              className="input"
              style={{ minHeight: 88, resize: 'vertical' }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a budgeting question…"
            />

            {error ? (
              <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                {error}
              </div>
            ) : null}

            {modelsUsed.length || toolsCalled.length || mcpServers.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                {modelsUsed.length ? (
                  <Badge tone="neutral">Models: {modelsUsed.join(' -> ')}</Badge>
                ) : null}
                {toolsCalled.length ? (
                  <Badge tone="neutral">Tools: {toolsCalled.join(', ')}</Badge>
                ) : null}
                {mcpServers.length ? (
                  <Badge tone="neutral">MCP: {mcpServers.join(', ')}</Badge>
                ) : (
                  <Badge tone="warn">MCP: not configured</Badge>
                )}
              </div>
            ) : null}

            {answer ? (
              <pre
                className="small"
                style={{
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 16,
                  padding: 14,
                  margin: 0,
                }}
              >
                {answer}
              </pre>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <TraceDrawer open={traceOpen} onOpenChange={setTraceOpen} trace={trace} />
    </div>
  );
}
