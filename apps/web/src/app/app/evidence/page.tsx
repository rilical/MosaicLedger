'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

type McpHealthResponse =
  | { ok: true; configured: boolean; healthUrl?: string; status?: number; body?: unknown }
  | { ok: false; error?: string };

type NessieProbeResponse =
  | {
      ok: true;
      configured: boolean;
      baseUrl: string;
      keyPresent: boolean;
      accounts?: unknown;
      selectedAccountId?: string | null;
      purchases?: unknown;
    }
  | { ok: false; error?: string };

type XrplHealthResponse =
  | { ok: true; configured: boolean; rpcHost: string | null; destinationConfigured: boolean }
  | { ok: false; error?: string };

export default function EvidencePage() {
  const [mcpStatus, setMcpStatus] = React.useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'done'; resp: McpHealthResponse }
    | { state: 'error'; error: string }
  >({ state: 'idle' });

  const [nessieStatus, setNessieStatus] = React.useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'done'; resp: NessieProbeResponse }
    | { state: 'error'; error: string }
  >({ state: 'idle' });

  const [xrplStatus, setXrplStatus] = React.useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'done'; resp: XrplHealthResponse }
    | { state: 'error'; error: string }
  >({ state: 'idle' });

  async function checkMcp() {
    setMcpStatus({ state: 'loading' });
    try {
      const resp = await fetch('/api/mcp/health', { method: 'GET' });
      const json = (await resp.json()) as McpHealthResponse;
      if (!resp.ok || !json) throw new Error('MCP health failed');
      setMcpStatus({ state: 'done', resp: json });
    } catch (e: unknown) {
      setMcpStatus({ state: 'error', error: e instanceof Error ? e.message : 'MCP health failed' });
    }
  }

  async function checkNessie() {
    setNessieStatus({ state: 'loading' });
    try {
      const resp = await fetch('/api/nessie/probe', { method: 'GET' });
      const json = (await resp.json()) as NessieProbeResponse;
      if (!resp.ok || !json) throw new Error('Nessie probe failed');
      setNessieStatus({ state: 'done', resp: json });
    } catch (e: unknown) {
      setNessieStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'Nessie probe failed',
      });
    }
  }

  async function checkXrpl() {
    setXrplStatus({ state: 'loading' });
    try {
      const resp = await fetch('/api/xrpl/health', { method: 'GET' });
      const json = (await resp.json()) as XrplHealthResponse;
      if (!resp.ok || !json) throw new Error('XRPL health failed');
      setXrplStatus({ state: 'done', resp: json });
    } catch (e: unknown) {
      setXrplStatus({
        state: 'error',
        error: e instanceof Error ? e.message : 'XRPL health failed',
      });
    }
  }

  const mcpBadge = (() => {
    if (mcpStatus.state === 'loading') return <Badge tone="warn">Checking…</Badge>;
    if (mcpStatus.state === 'error') return <Badge tone="warn">Error</Badge>;
    if (mcpStatus.state === 'done') {
      const r = mcpStatus.resp;
      if (!r.ok) return <Badge tone="warn">Fail</Badge>;
      if (!r.configured) return <Badge tone="warn">Not configured</Badge>;
      return <Badge tone="good">OK</Badge>;
    }
    return <Badge tone="neutral">Idle</Badge>;
  })();

  const nessieBadge = (() => {
    if (nessieStatus.state === 'loading') return <Badge tone="warn">Checking…</Badge>;
    if (nessieStatus.state === 'error') return <Badge tone="warn">Error</Badge>;
    if (nessieStatus.state === 'done') {
      const r = nessieStatus.resp;
      if (!r.ok) return <Badge tone="warn">Fail</Badge>;
      if (!r.configured) return <Badge tone="warn">Not configured</Badge>;
      return <Badge tone="good">OK</Badge>;
    }
    return <Badge tone="neutral">Idle</Badge>;
  })();

  const xrplBadge = (() => {
    if (xrplStatus.state === 'loading') return <Badge tone="warn">Checking…</Badge>;
    if (xrplStatus.state === 'error') return <Badge tone="warn">Error</Badge>;
    if (xrplStatus.state === 'done') {
      const r = xrplStatus.resp;
      if (!r.ok) return <Badge tone="warn">Fail</Badge>;
      if (!r.configured) return <Badge tone="warn">Simulate-only</Badge>;
      return <Badge tone="good">OK</Badge>;
    }
    return <Badge tone="neutral">Idle</Badge>;
  })();

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Evidence</h1>
        <div className="pageMeta">
          <div className="pageTagline">One screen to prove the prize-relevant parts work.</div>
          {mcpBadge}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="buttonRow">
            <Link className="btn btnPrimary" href="/app/mosaic?source=demo">
              Demo Mosaic
            </Link>
            <Link className="btn btnGhost" href="/app/capital-one">
              Capital One
            </Link>
            <Link className="btn btnGhost" href="/app/ops">
              Ops
            </Link>
            <Link className="btn btnGhost" href="/app/coach">
              Coach
            </Link>
            <Link className="btn btnGhost" href="/app/export">
              Export Poster
            </Link>
            <Link className="btn btnGhost" href="/app/xrpl">
              XRPL
            </Link>
            <Link className="btn btnGhost" href="/health">
              Health
            </Link>
            <Link className="btn btnGhost" href="/prize-ledger">
              Prize Ledger (MD)
            </Link>
            <Link className="btn btnGhost" href="/game">
              Minesweeper (15KB)
            </Link>
            <Link className="btn btnGhost" href="/mosaic-game">
              Mosaic Sprint
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>MCP (Tool Calling Transport)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              If you set <code>DEDALUS_MCP_SERVER_URL</code>, Coach can call tools via MCP. This
              check pings the configured server’s <code>/health</code>.
            </div>
            <div className="buttonRow" style={{ marginTop: 12, alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={() => void checkMcp()}
                disabled={mcpStatus.state === 'loading'}
              >
                Check MCP Health
              </Button>
              {mcpBadge}
            </div>
            {mcpStatus.state === 'done' ? (
              <details style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Details
                </summary>
                <pre className="small" style={{ marginTop: 10, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                  {JSON.stringify(mcpStatus.resp, null, 2)}
                </pre>
              </details>
            ) : mcpStatus.state === 'error' ? (
              <div className="small" style={{ marginTop: 12, color: 'rgba(234,179,8,0.95)' }}>
                {mcpStatus.error}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capital One Nessie</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              Nessie can power <code>source=nessie</code> analysis. If it fails, MosaicLedger falls
              back to demo data so judges never get stuck.
            </div>
            <div className="buttonRow" style={{ marginTop: 12, alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={() => void checkNessie()}
                disabled={nessieStatus.state === 'loading'}
              >
                Probe Nessie API
              </Button>
              {nessieBadge}
              <Link className="btn btnPrimary" href="/app/mosaic?source=nessie">
                Open Mosaic (Nessie)
              </Link>
              <Link className="btn btnGhost" href="/app">
                Connect Nessie
              </Link>
            </div>

            {nessieStatus.state === 'done' ? (
              <details style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Details
                </summary>
                <pre className="small" style={{ marginTop: 10, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                  {JSON.stringify(nessieStatus.resp, null, 2)}
                </pre>
              </details>
            ) : nessieStatus.state === 'error' ? (
              <div className="small" style={{ marginTop: 12, color: 'rgba(234,179,8,0.95)' }}>
                {nessieStatus.error}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>XRPL Testnet</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              Optional Ripple track. When configured, the XRPL page can submit a real Testnet
              Payment and show the explorer link. Otherwise it runs deterministic simulation.
            </div>
            <div className="buttonRow" style={{ marginTop: 12, alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={() => void checkXrpl()}
                disabled={xrplStatus.state === 'loading'}
              >
                Check XRPL Config
              </Button>
              {xrplBadge}
              <Link className="btn btnPrimary" href="/app/xrpl">
                Open XRPL Page
              </Link>
            </div>

            {xrplStatus.state === 'done' ? (
              <details style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Details
                </summary>
                <pre className="small" style={{ marginTop: 10, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                  {JSON.stringify(xrplStatus.resp, null, 2)}
                </pre>
              </details>
            ) : xrplStatus.state === 'error' ? (
              <div className="small" style={{ marginTop: 12, color: 'rgba(234,179,8,0.95)' }}>
                {xrplStatus.error}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>XRPL Demo Flow</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              Recommended: click “Simulate Receipt” for judge-safe evidence, then optionally switch
              Mode to TESTNET to submit a real transaction (requires env).
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
