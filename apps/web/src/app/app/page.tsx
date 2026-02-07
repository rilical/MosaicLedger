'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { analyzeOps } from '@mosaicledger/engine';
import type {
  DateRange,
  NormalizedTransaction as OpsTxn,
  OpsFinding,
} from '@mosaicledger/contracts';
import type { ActionRecommendation, RecurringCharge } from '@mosaicledger/core';
import { MosaicView } from '../../components/MosaicView';
import { AnalysisControls } from '../../components/Analysis/AnalysisControls';
import type { AnalysisSettings } from '../../components/Analysis/types';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../components/Analysis/useAnalysis';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { useFlags } from '../../lib/flags-client';
import { computeOpsDashboard } from '../../lib/ops/dashboard';

type XrplHealth =
  | { ok: true; configured: boolean; rpcHost: string | null; destinationConfigured: boolean }
  | { ok: false; error?: string };

type XrplReceipt =
  | {
      ok: true;
      receipt: { mode: 'simulate' | 'testnet'; amountXrp: number; txHash: string };
      explorerUrl?: string;
    }
  | { ok: false; error?: string };

type OverviewResp =
  | {
      ok: true;
      configured: boolean;
      mode: 'demo' | 'live';
      query?: { lat: number; lng: number; rad: number };
      billsUpcoming30d?: { upcomingCount: number; upcomingIds: string[] };
      atms?: Array<{
        _id?: string;
        name?: string;
        accessibility?: boolean;
        amount_left?: number;
        geocode?: { lat?: number; lng?: number };
      }>;
      branches?: Array<{
        _id?: string;
        name?: string;
        phone_number?: string;
        address?: {
          street_number?: string;
          street_name?: string;
          city?: string;
          state?: string;
          zip?: string;
        };
      }>;
      errors?: Record<string, string | null>;
    }
  | { ok: false; error?: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object';
}

function toYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function latestDate(dates: string[]): string | null {
  let max: string | null = null;
  for (const d of dates) if (!max || d > max) max = d;
  return max;
}

function earliestDate(dates: string[]): string | null {
  let min: string | null = null;
  for (const d of dates) if (!min || d < min) min = d;
  return min;
}

function addDays(yyyyMmDd: string, deltaDays: number): string {
  const dt = new Date(`${yyyyMmDd}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return toYyyyMmDd(dt);
}

function fmtUsd(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

function mapsLinkFromLatLng(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function mapsLinkFromAddress(addr: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function fmtAddr(
  a: NonNullable<NonNullable<OverviewResp & { ok: true }>['branches']>[number]['address'],
): string {
  if (!a) return '';
  const parts = [
    [a.street_number, a.street_name].filter(Boolean).join(' ').trim(),
    [a.city, a.state, a.zip].filter(Boolean).join(' ').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  return parts;
}

function upcomingRecurring(recurring: RecurringCharge[]): {
  list: RecurringCharge[];
  total: number;
} {
  const now = toYyyyMmDd(new Date());
  const end = addDays(now, 30);
  const list = recurring
    .filter((r) => r.nextDate >= now && r.nextDate <= end)
    .slice()
    .sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0));
  const total = list.reduce((sum, r) => sum + r.expectedAmount, 0);
  return { list, total };
}

function computeRoundupFromTxns(txns: Array<{ amount: number }>): { roundupUsd: number } {
  let roundup = 0;
  for (const t of txns) {
    const amt = Number(t.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    roundup += Math.ceil(amt) - amt;
  }
  return { roundupUsd: roundup };
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { flags, setFlag } = useFlags();
  const { settings, setSettings } = useAnalysisSettings();

  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, stage, isSlow, recompute } = useAnalysis(req);

  const txns = artifacts?.transactions ?? [];
  const dates = React.useMemo(() => txns.map((t) => t.date).filter(Boolean), [txns]);
  const range: DateRange = React.useMemo(() => {
    const max = latestDate(dates) ?? toYyyyMmDd(new Date());
    const min = earliestDate(dates) ?? addDays(max, -29);
    return { start: min, end: max };
  }, [dates]);

  const ops = React.useMemo(() => {
    if (!txns.length) {
      return {
        dashboard: null as ReturnType<typeof computeOpsDashboard> | null,
        findings: [] as OpsFinding[],
      };
    }
    const opsTxns = txns as unknown as OpsTxn[];
    const analysis = analyzeOps(opsTxns, range);
    const dashboard = computeOpsDashboard({ txns: opsTxns, findings: analysis.findings, range });
    return { dashboard, findings: analysis.findings };
  }, [range, txns]);

  const recurring = artifacts?.recurring ?? [];
  const upcoming = React.useMemo(() => upcomingRecurring(recurring), [recurring]);

  const roundup = React.useMemo(() => computeRoundupFromTxns(txns), [txns]);
  const amountXrp = roundup.roundupUsd; // deterministic demo assumption: 1 XRP ~= 1 USD

  const [xrplHealth, setXrplHealth] = React.useState<XrplHealth | null>(null);
  const [xrplReceipt, setXrplReceipt] = React.useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'done'; resp: XrplReceipt }
    | { state: 'error'; error: string }
  >({ state: 'idle' });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await fetch('/api/xrpl/health', { method: 'GET' });
        const json = (await resp.json()) as unknown;
        if (!alive) return;
        if (isRecord(json) && typeof json.ok === 'boolean') {
          setXrplHealth(json as XrplHealth);
        } else {
          setXrplHealth({ ok: false, error: 'invalid_response' });
        }
      } catch {
        if (!alive) return;
        setXrplHealth({ ok: false, error: 'health_failed' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mosaicledger.roundupReceipt.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return;
      setXrplReceipt({ state: 'done', resp: parsed as XrplReceipt });
    } catch {
      // ignore
    }
  }, []);

  const sendRoundup = React.useCallback(
    async (mode: 'simulate' | 'testnet') => {
      setXrplReceipt({ state: 'loading' });
      try {
        const memo = [
          'mosaicledger_roundup',
          `source=${artifacts?.source ?? 'unknown'}`,
          `range_start=${range.start}`,
          `range_end=${range.end}`,
          `txns=${txns.length}`,
          `spend_usd=${(artifacts?.summary.totalSpend ?? 0).toFixed(2)}`,
          `roundup_usd=${roundup.roundupUsd.toFixed(2)}`,
          `ts=${new Date().toISOString()}`,
        ].join('|');

        const resp = await fetch('/api/xrpl/send-roundup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ amountXrp, memo, mode }),
        });
        const json = (await resp.json()) as unknown;
        if (!resp.ok || !isRecord(json)) throw new Error(`Sweep failed (${resp.status})`);
        if (json.ok !== true) throw new Error(String(json.error ?? 'Sweep failed'));
        const out = json as XrplReceipt;
        setXrplReceipt({ state: 'done', resp: out });
        try {
          window.localStorage.setItem('mosaicledger.roundupReceipt.v1', JSON.stringify(out));
        } catch {
          // ignore
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Sweep failed';
        setXrplReceipt({ state: 'error', error: msg });
      }
    },
    [
      amountXrp,
      artifacts?.source,
      artifacts?.summary.totalSpend,
      range.end,
      range.start,
      roundup.roundupUsd,
      txns.length,
    ],
  );

  const [loc, setLoc] = React.useState<{ lat: string; lng: string; rad: string }>({
    lat: '40.4433',
    lng: '-79.9436',
    rad: '2',
  });

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mosaicledger.location.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) return;
      setLoc((prev) => ({
        lat: typeof parsed.lat === 'string' ? parsed.lat : prev.lat,
        lng: typeof parsed.lng === 'string' ? parsed.lng : prev.lng,
        rad: typeof parsed.rad === 'string' ? parsed.rad : prev.rad,
      }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('mosaicledger.location.v1', JSON.stringify(loc));
    } catch {
      // ignore
    }
  }, [loc.lat, loc.lng, loc.rad]);

  const [overview, setOverview] = React.useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'done'; resp: OverviewResp }
    | { state: 'error'; error: string }
  >({ state: 'idle' });

  const loadOverview = React.useCallback(async () => {
    if (!flags.nessieEnabled) return;
    setOverview({ state: 'loading' });
    try {
      const qp = new URLSearchParams({ lat: loc.lat, lng: loc.lng, rad: loc.rad });
      const resp = await fetch(`/api/nessie/overview?${qp.toString()}`, { method: 'GET' });
      const json = (await resp.json()) as unknown;
      if (!resp.ok || !isRecord(json)) throw new Error('connector_failed');
      if (json.ok !== true) throw new Error(String(json.error ?? 'connector_failed'));
      setOverview({ state: 'done', resp: json as OverviewResp });
    } catch (e: unknown) {
      setOverview({ state: 'error', error: e instanceof Error ? e.message : 'connector_failed' });
    }
  }, [flags.nessieEnabled, loc.lat, loc.lng, loc.rad]);

  const loadOverviewRef = React.useRef(loadOverview);
  loadOverviewRef.current = loadOverview;
  React.useEffect(() => {
    if (!flags.nessieEnabled) return;
    void loadOverviewRef.current();
  }, [flags.nessieEnabled]);

  const [connectorStep, setConnectorStep] = React.useState<'idle' | 'bootstrapping' | 'syncing'>(
    'idle',
  );
  const [connectorError, setConnectorError] = React.useState<string | null>(null);

  const applyJudgePreset = React.useCallback(() => {
    setFlag('judgeMode', true);
    setFlag('demoMode', true);
    setFlag('aiEnabled', false);
    setFlag('debugTraces', false);
    patchAnalysisSettings({ source: 'demo' });
    router.push('/app/mosaic?source=demo');
  }, [router, setFlag]);

  const connectBankingConnector = React.useCallback(async () => {
    setConnectorStep('bootstrapping');
    setConnectorError(null);
    try {
      const resp = await fetch('/api/nessie/bootstrap', { method: 'POST' });
      const json = (await resp.json()) as
        | { ok: true; customerId?: string; accountId?: string; mode?: string }
        | { ok: false; error?: string };
      if (!resp.ok || !json.ok) {
        throw new Error(('error' in json ? json.error : null) ?? 'Connector bootstrap failed');
      }

      const customerId = typeof json.customerId === 'string' ? json.customerId.trim() : '';
      const accountId = typeof json.accountId === 'string' ? json.accountId.trim() : '';
      if (!accountId) {
        throw new Error('Connector did not return an account id (check env + key).');
      }
      const isNoAuth = json.mode === 'env_noauth' || !customerId;

      if (!isNoAuth) {
        try {
          setConnectorStep('syncing');
          const syncResp = await fetch('/api/nessie/sync', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ customerId, accountId }),
          });
          const syncJson = (await syncResp.json()) as
            | { ok: true; counts?: { purchases?: number } }
            | { ok: false; error?: string };
          if (syncResp.ok && syncJson.ok && (syncJson.counts?.purchases ?? 0) === 0) {
            try {
              await fetch('/api/nessie/simulate-week', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ customerId, accountId }),
              });
              await fetch('/api/nessie/sync', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ customerId, accountId }),
              });
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }

      patchAnalysisSettings({
        source: 'nessie',
        ...(customerId ? { nessieCustomerId: customerId } : {}),
        nessieAccountId: accountId,
      });

      router.push('/app/mosaic?source=nessie');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connector bootstrap failed';
      setConnectorError(msg);
      patchAnalysisSettings({ source: 'demo' });
      router.push('/app/mosaic?source=demo');
    } finally {
      setConnectorStep('idle');
    }
  }, [router]);

  const spend = artifacts?.summary.totalSpend ?? 0;
  const riskScore = ops.dashboard?.kpis.riskScore ?? 0;
  const projectedSpend30d = ops.dashboard?.forecast30d.projectedSpend ?? 0;
  const projectedHighRisk = ops.dashboard?.forecast30d.projectedHighRiskEvents ?? 0;

  const topActions = (artifacts?.actionPlan ?? []).slice(0, 3) as ActionRecommendation[];
  const topFindings = ops.findings.slice(0, 3);

  return (
    <div className="pageStack" style={{ maxWidth: 1150 }}>
      <div className="pageHeader">
        <div className="pageMeta">
          <div className="pageTagline">Cashflow, risk, and next actions in one view.</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={flags.demoMode ? 'good' : 'neutral'}>
              {flags.demoMode ? 'DEMO' : 'LIVE'}
            </Badge>
            {artifacts?.source ? (
              <Badge tone="neutral">
                Source:{' '}
                {artifacts.source === 'nessie'
                  ? 'Banking Connector'
                  : artifacts.source === 'plaid_fixture'
                    ? 'Bank (fixture)'
                    : artifacts.source === 'plaid'
                      ? 'Bank'
                      : 'Demo'}
              </Badge>
            ) : null}
            <Badge tone={flags.aiEnabled ? 'neutral' : 'good'}>
              {flags.aiEnabled ? 'AI ON' : 'AI OFF'}
            </Badge>
            <Badge tone={riskScore >= 70 ? 'warn' : riskScore >= 40 ? 'neutral' : 'good'}>
              Risk {Math.round(riskScore)}/100
            </Badge>
            <Badge tone={error ? 'warn' : loading ? 'warn' : 'good'}>
              {error ? 'Error' : loading ? stage.toUpperCase() : 'READY'}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snapshot</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div>
              <div style={{ fontWeight: 750 }}>{fmtUsd(spend)}</div>
              <div className="small">Spend (selected range)</div>
            </div>
            <div>
              <div style={{ fontWeight: 750 }}>{fmtUsd(upcoming.total)}</div>
              <div className="small">Upcoming recurring (next 30 days)</div>
            </div>
            <div>
              <div style={{ fontWeight: 750 }}>{fmtUsd(projectedSpend30d)}</div>
              <div className="small">Projected spend (next 30 days)</div>
            </div>
            <div>
              <div style={{ fontWeight: 750 }}>{Math.round(projectedHighRisk)}</div>
              <div className="small">Projected high-risk events (30 days)</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <details>
              <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                Range and filters
              </summary>
              <div style={{ marginTop: 12 }}>
                <AnalysisControls
                  settings={settings}
                  setSettings={setSettings}
                  loading={loading}
                  onRecompute={() => void recompute()}
                />
                {isSlow ? (
                  <div className="small" style={{ marginTop: 10, opacity: 0.9 }}>
                    If anything external flakes, flip Judge Mode ON in Runtime Flags to force the
                    always-works path.
                  </div>
                ) : null}
              </div>
            </details>
          </div>

          {error ? (
            <div className="small" style={{ marginTop: 12, color: 'rgba(234,179,8,0.95)' }}>
              {error}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1.05fr 0.95fr' }}>
        <Card>
          <CardHeader>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'baseline',
              }}
            >
              <CardTitle>Mosaic</CardTitle>
              <Link className="btn btnGhost" href="/app/mosaic">
                Open Mosaic
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {!artifacts ? (
              <div className="small">Computing mosaic…</div>
            ) : (
              <MosaicView
                tiles={artifacts.mosaic.tiles}
                totalSpend={artifacts.summary.totalSpend}
              />
            )}
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <CardTitle>Next Best Actions</CardTitle>
                <Link className="btn btnGhost" href="/app/plan">
                  Open Actions
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {!artifacts ? (
                <div className="small">Waiting for analysis…</div>
              ) : topActions.length ? (
                <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10 }}>
                  {topActions.map((a) => (
                    <li key={a.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 650 }}>{a.title}</div>
                          <div className="small">{a.explanation}</div>
                        </div>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          +{fmtUsd(a.expectedMonthlySavings)}/mo
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="small">No actions yet. Open Actions and set a goal.</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <CardTitle>Ops: Risk and Forecast</CardTitle>
                <Link className="btn btnGhost" href="/app/ops">
                  Open Ops
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {!ops.dashboard ? (
                <div className="small">Waiting for transactions…</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 750 }}>
                        {Math.round(ops.dashboard.kpis.riskScore)}/100
                      </div>
                      <div className="small">Risk score</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 750 }}>
                        {(ops.dashboard.kpis.exceptionRate * 100).toFixed(1)}%
                      </div>
                      <div className="small">Exception rate</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 750 }}>
                        {fmtUsd(ops.dashboard.forecast30d.projectedSpend)}
                      </div>
                      <div className="small">Projected spend (30d)</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 750 }}>
                        {ops.dashboard.forecast30d.projectedHighRiskEvents}
                      </div>
                      <div className="small">High-risk events (30d)</div>
                    </div>
                  </div>

                  {topFindings.length ? (
                    <div>
                      <div className="small" style={{ marginBottom: 8 }}>
                        Top signals
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {topFindings.map((f) => (
                          <div
                            key={String(f.id)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 14,
                              border: '1px solid rgba(255,255,255,0.10)',
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 650 }}>
                                {(f.kind ?? 'signal').toString().replace(/_/g, ' ')}
                              </div>
                              <div className="small">
                                {f.why && Array.isArray(f.why) && f.why[0]
                                  ? String(f.why[0])
                                  : 'Review the Ops details.'}
                              </div>
                            </div>
                            <Badge
                              tone={
                                f.severity === 'high'
                                  ? 'warn'
                                  : f.severity === 'med'
                                    ? 'neutral'
                                    : 'good'
                              }
                            >
                              {String(f.severity ?? 'low').toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Round-up Sweep</CardTitle>
          </CardHeader>
          <CardBody>
            {!artifacts ? (
              <div className="small">Waiting for analysis…</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="small" style={{ opacity: 0.9 }}>
                  Deterministic micro-savings: round each spend txn to the next whole dollar and sum
                  the deltas.
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 750 }}>{txns.length}</div>
                    <div className="small">Transactions</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 750 }}>{fmtUsd(spend)}</div>
                    <div className="small">Spend (USD)</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 750 }}>{fmtUsd(roundup.roundupUsd)}</div>
                    <div className="small">Round-up (USD)</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 750 }}>{amountXrp.toFixed(6)} XRP</div>
                    <div className="small">Sweep amount (demo)</div>
                  </div>
                </div>

                {!flags.xrplEnabled ? (
                  <div className="small">
                    Round-up transfers are disabled. Enable in Runtime Flags to use simulation and
                    optional Testnet sends.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div className="buttonRow" style={{ alignItems: 'center' }}>
                      <Button
                        variant="primary"
                        onClick={() => void sendRoundup('simulate')}
                        disabled={xrplReceipt.state === 'loading'}
                      >
                        {xrplReceipt.state === 'loading' ? 'Working…' : 'Simulate sweep'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void sendRoundup('testnet')}
                        disabled={
                          xrplReceipt.state === 'loading' ||
                          !(xrplHealth && xrplHealth.ok && xrplHealth.configured) ||
                          !(amountXrp > 0)
                        }
                      >
                        Send sweep (Testnet)
                      </Button>
                      {xrplHealth && xrplHealth.ok ? (
                        <Badge tone={xrplHealth.configured ? 'good' : 'warn'}>
                          {xrplHealth.configured ? 'Testnet ready' : 'Simulate-only'}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Status unknown</Badge>
                      )}
                    </div>

                    {xrplReceipt.state === 'error' ? (
                      <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                        {xrplReceipt.error}
                      </div>
                    ) : null}

                    {xrplReceipt.state === 'done' ? (
                      <details>
                        <summary
                          className="small"
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Last receipt
                        </summary>
                        <pre
                          className="small"
                          style={{ marginTop: 10, whiteSpace: 'pre-wrap', opacity: 0.9 }}
                        >
                          {JSON.stringify(xrplReceipt.resp, null, 2)}
                        </pre>
                        {xrplReceipt.resp.ok && xrplReceipt.resp.explorerUrl ? (
                          <div style={{ marginTop: 8 }}>
                            <a
                              className="small"
                              href={xrplReceipt.resp.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open explorer
                            </a>
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations & Access</CardTitle>
          </CardHeader>
          <CardBody>
            {!flags.nessieEnabled ? (
              <div className="small">
                Banking connector is disabled. Enable it in Runtime Flags to show nearby locations
                and bill signals.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  className="buttonRow"
                  style={{ alignItems: 'end', justifyContent: 'space-between' }}
                >
                  <div className="buttonRow" style={{ alignItems: 'end' }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div className="small">Lat</div>
                      <input
                        className="input"
                        value={loc.lat}
                        onChange={(e) => setLoc((s) => ({ ...s, lat: e.target.value }))}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div className="small">Lng</div>
                      <input
                        className="input"
                        value={loc.lng}
                        onChange={(e) => setLoc((s) => ({ ...s, lng: e.target.value }))}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div className="small">Radius (mi)</div>
                      <input
                        className="input"
                        value={loc.rad}
                        onChange={(e) => setLoc((s) => ({ ...s, rad: e.target.value }))}
                      />
                    </label>
                    <Button
                      variant="primary"
                      onClick={() => void loadOverview()}
                      disabled={overview.state === 'loading'}
                    >
                      {overview.state === 'loading' ? 'Loading…' : 'Refresh'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setLoc((s) => ({
                              ...s,
                              lat: pos.coords.latitude.toFixed(4),
                              lng: pos.coords.longitude.toFixed(4),
                            }));
                          },
                          () => {
                            // ignore
                          },
                          { enableHighAccuracy: false, timeout: 4000 },
                        );
                      }}
                      disabled={overview.state === 'loading'}
                    >
                      Use my location
                    </Button>
                  </div>
                </div>

                {overview.state === 'error' ? (
                  <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                    {overview.error}
                  </div>
                ) : null}

                {overview.state === 'done' ? (
                  overview.resp.ok ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div className="buttonRow" style={{ alignItems: 'center' }}>
                        <Badge tone={overview.resp.configured ? 'good' : 'warn'}>
                          {overview.resp.configured ? 'Live connector' : 'Demo fallback'}
                        </Badge>
                        {overview.resp.billsUpcoming30d ? (
                          <Badge tone="neutral">
                            Bills due (30d): {overview.resp.billsUpcoming30d.upcomingCount}
                          </Badge>
                        ) : null}
                      </div>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ fontWeight: 700 }}>Nearby ATMs</div>
                        {(() => {
                          const atms = overview.resp.atms?.slice(0, 5) ?? [];
                          if (!atms.length)
                            return <div className="small">No ATMs found for this location.</div>;
                          return (
                            <div style={{ display: 'grid', gap: 8 }}>
                              {atms.map((a, idx) => {
                                const alat = Number(a.geocode?.lat);
                                const alng = Number(a.geocode?.lng);
                                const hasGeo = Number.isFinite(alat) && Number.isFinite(alng);
                                return (
                                  <div
                                    key={String(a._id ?? `atm-${idx}`)}
                                    style={{
                                      display: 'grid',
                                      gap: 4,
                                      padding: '10px 12px',
                                      borderRadius: 14,
                                      border: '1px solid rgba(255,255,255,0.10)',
                                      background: 'rgba(255,255,255,0.03)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                      }}
                                    >
                                      <div style={{ fontWeight: 650 }}>{a.name || 'ATM'}</div>
                                      <div className="small" style={{ opacity: 0.9 }}>
                                        {typeof a.amount_left === 'number'
                                          ? `$${a.amount_left}`
                                          : ''}
                                      </div>
                                    </div>
                                    <div className="small">
                                      {a.accessibility ? 'Accessible' : 'Accessibility unknown'}
                                      {hasGeo ? ` · ${alat.toFixed(4)}, ${alng.toFixed(4)}` : ''}
                                    </div>
                                    {hasGeo ? (
                                      <a
                                        className="small"
                                        href={mapsLinkFromLatLng(alat, alng)}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open in Google Maps
                                      </a>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ fontWeight: 700 }}>Nearby branches</div>
                        {(() => {
                          const branches = overview.resp.branches?.slice(0, 5) ?? [];
                          if (!branches.length)
                            return <div className="small">No branches found.</div>;
                          return (
                            <div style={{ display: 'grid', gap: 8 }}>
                              {branches.map((b, idx) => {
                                const addr = fmtAddr(b.address);
                                return (
                                  <div
                                    key={String(b._id ?? `branch-${idx}`)}
                                    style={{
                                      display: 'grid',
                                      gap: 4,
                                      padding: '10px 12px',
                                      borderRadius: 14,
                                      border: '1px solid rgba(255,255,255,0.10)',
                                      background: 'rgba(255,255,255,0.03)',
                                    }}
                                  >
                                    <div style={{ fontWeight: 650 }}>{b.name || 'Branch'}</div>
                                    {addr ? <div className="small">{addr}</div> : null}
                                    {b.phone_number ? (
                                      <div className="small">Phone: {b.phone_number}</div>
                                    ) : null}
                                    {addr ? (
                                      <a
                                        className="small"
                                        href={mapsLinkFromAddress(addr)}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open in Google Maps
                                      </a>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="small" style={{ opacity: 0.9 }}>
                      {overview.resp.error ?? 'Connector failed.'}
                    </div>
                  )
                ) : (
                  <div className="small" style={{ opacity: 0.9 }}>
                    Click Refresh to load nearby locations. In judge/demo mode this uses a safe
                    fallback.
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup & Judge Controls</CardTitle>
        </CardHeader>
        <CardBody>
          <details>
            <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
              Open setup tools
            </summary>
            <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div className="small">
                Recommended for judging: start deterministic demo data first, then open Evidence to
                prove integrations.
              </div>

              <div className="buttonRow" style={{ alignItems: 'center' }}>
                <Button variant="primary" onClick={applyJudgePreset}>
                  Start Judge Demo
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFlag('judgeMode', true);
                    setFlag('demoMode', true);
                    router.push('/app/evidence');
                  }}
                >
                  Open Evidence Screen
                </Button>
                <Badge tone={flags.demoMode ? 'good' : 'neutral'}>
                  {flags.demoMode ? 'Demo ON' : 'Demo OFF'}
                </Badge>
                {flags.judgeMode ? (
                  <Badge tone="warn">Judge ON</Badge>
                ) : (
                  <Badge tone="neutral">Judge OFF</Badge>
                )}
              </div>

              {connectorError ? (
                <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
                  Connector: {connectorError} (fell back to demo data)
                </div>
              ) : null}

              <div className="choiceGrid">
                <div className="choiceCard">
                  <div className="choiceHeader">
                    <div>
                      <div className="choiceTitle">Banking Connector</div>
                      <div className="small">
                        Pulls mock purchases into the same deterministic engine.
                      </div>
                    </div>
                    <Badge tone={flags.nessieEnabled ? 'neutral' : 'warn'}>
                      {flags.nessieEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="buttonRow">
                    <Button
                      variant="primary"
                      disabled={!flags.nessieEnabled || connectorStep !== 'idle'}
                      onClick={() => void connectBankingConnector()}
                    >
                      {connectorStep === 'bootstrapping'
                        ? 'Connecting…'
                        : connectorStep === 'syncing'
                          ? 'Syncing…'
                          : 'Connect'}
                    </Button>
                    <Button variant="ghost" onClick={() => router.push('/app/evidence')}>
                      Probe in Evidence
                    </Button>
                  </div>
                  {!flags.nessieEnabled ? (
                    <div className="small">Enable in Runtime Flags.</div>
                  ) : null}
                </div>

                <div className="choiceCard">
                  <div className="choiceHeader">
                    <div>
                      <div className="choiceTitle">Bank Link (Sandbox)</div>
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
                      Connect bank
                    </Button>
                    <Button variant="ghost" onClick={() => router.push('/app/settings')}>
                      Settings
                    </Button>
                  </div>
                </div>
              </div>

              <div className="buttonRow">
                <Link className="btn btnGhost" href="/app/evidence">
                  Evidence (proof)
                </Link>
                <Link className="btn btnGhost" href="/app/settings">
                  Runtime flags
                </Link>
                <Link className="btn btnGhost" href="/game">
                  Minesweeper
                </Link>
              </div>
            </div>
          </details>
        </CardBody>
      </Card>
    </div>
  );
}
