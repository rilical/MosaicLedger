import { buildTreemap, type TreemapTile } from '@mosaicledger/mosaic';
import { analyzeOps } from '@mosaicledger/engine';
import type {
  DateRange,
  NormalizedTransaction,
  OpsBrief,
  OpsFinding,
} from '@mosaicledger/contracts';
import { MosaicView } from '../../../components/MosaicView';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { OpsMemoPanel } from '../../../components/Ops/OpsMemoPanel';
import { OpsDashboardCards } from '../../../components/Ops/OpsDashboardCards';
import { OpsDecisionPanel } from '../../../components/Ops/OpsDecisionPanel';
import { computeDemoArtifacts } from '../../../lib/analysis/compute';
import { envFlags } from '../../../lib/flags';
import { hasSupabaseEnv, parseBooleanEnv } from '../../../lib/env';
import { supabaseServer } from '../../../lib/supabase/server';
import { computeOpsDashboard } from '../../../lib/ops/dashboard';
import { hasNessieEnv, nessieServerClient } from '../../../lib/nessie/serverClient';

type CapitalOneSignals = {
  billsUpcoming30dCount: number;
};

function latestDate(dates: string[]): string | null {
  let max: string | null = null;
  for (const d of dates) if (!max || d > max) max = d;
  return max;
}

function toUtcDate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

function addDays(yyyyMmDd: string, deltaDays: number): string {
  const dt = toUtcDate(yyyyMmDd);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function defaultRangeFromDemo(): DateRange {
  const demo = computeDemoArtifacts();
  const dates = (demo.transactions ?? []).map((t) => t.date);
  const max = latestDate(dates) ?? new Date().toISOString().slice(0, 10);
  // Demo-friendly: show the last 30 days of available data.
  return { start: addDays(max, -29), end: max };
}

async function loadCapitalOneSignals(): Promise<CapitalOneSignals | null> {
  // Never let sponsor calls block the judge path.
  if (envFlags.demoMode || envFlags.judgeMode) return null;
  if (!hasNessieEnv()) return null;

  let accountId = process.env.NESSIE_ACCOUNT_ID?.trim() || null;
  if (!accountId && hasSupabaseEnv()) {
    try {
      const sb = await supabaseServer();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        const { data: row } = await sb
          .from('nessie_customers')
          .select('nessie_account_id')
          .eq('user_id', user.id)
          .maybeSingle();
        const r = row as unknown as { nessie_account_id?: unknown } | null;
        if (r && typeof r.nessie_account_id === 'string') accountId = r.nessie_account_id;
      }
    } catch {
      // ignore
    }
  }
  if (!accountId) return null;

  try {
    const nessie = nessieServerClient();
    const billsResp = await nessie.listBillsByAccount(accountId);
    if (!billsResp.ok) return null;
    const bills = Array.isArray(billsResp.data) ? billsResp.data : [];
    const now = new Date().toISOString().slice(0, 10);
    const end = (() => {
      const d = new Date(now + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 30);
      return d.toISOString().slice(0, 10);
    })();

    const billsUpcoming30dCount = bills.filter((b) => {
      const d = String(b.upcoming_payment_date || b.payment_date || '').slice(0, 10);
      return d >= now && d <= end;
    }).length;

    return { billsUpcoming30dCount };
  } catch {
    return null;
  }
}

async function loadTransactions(
  range: DateRange,
): Promise<{ txns: NormalizedTransaction[]; source: 'db' | 'demo' }> {
  // Demo/judge-safe mode: never require auth or schema.
  if (envFlags.demoMode || envFlags.judgeMode || !hasSupabaseEnv()) {
    const demo = computeDemoArtifacts({ preset: 'custom', customRange: range });
    return {
      txns: (demo.transactions ?? []) as unknown as NormalizedTransaction[],
      source: 'demo',
    };
  }

  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      const demo = computeDemoArtifacts({ preset: 'custom', customRange: range });
      return {
        txns: (demo.transactions ?? []) as unknown as NormalizedTransaction[],
        source: 'demo',
      };
    }

    const { data: rows, error } = await sb
      .from('transactions_normalized')
      .select('txn_id,date,amount,merchant_raw,merchant,category,source,account_id,pending')
      .eq('user_id', user.id)
      .gte('date', range.start)
      .lte('date', range.end)
      .order('date', { ascending: false })
      .limit(20000);

    if (error || !rows) throw error ?? new Error('missing transactions');

    const txns: NormalizedTransaction[] = rows
      .map((r) => {
        const row = r as unknown as Record<string, unknown>;
        const id = typeof row.txn_id === 'string' ? row.txn_id : '';
        const date = String(row.date ?? '').slice(0, 10);
        const amount = Number(row.amount);
        const merchantRaw = String(row.merchant_raw ?? '');
        const merchant = String(row.merchant ?? '');
        const category = String(row.category ?? 'Uncategorized');
        const sourceRaw = typeof row.source === 'string' ? row.source : 'bank';
        const source =
          sourceRaw === 'demo' ||
          sourceRaw === 'nessie' ||
          sourceRaw === 'csv' ||
          sourceRaw === 'bank'
            ? (sourceRaw as NormalizedTransaction['source'])
            : 'bank';
        const accountId = typeof row.account_id === 'string' ? row.account_id : undefined;
        const pending = Boolean(row.pending);

        if (!id || !date || !merchantRaw || !Number.isFinite(amount)) return null;
        return { id, date, amount, merchantRaw, merchant, category, source, accountId, pending };
      })
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    if (txns.length) return { txns, source: 'db' };
  } catch {
    // fall through to demo
  }

  const demo = computeDemoArtifacts({ preset: 'custom', customRange: range });
  return { txns: (demo.transactions ?? []) as unknown as NormalizedTransaction[], source: 'demo' };
}

function briefTone(sev: OpsBrief['severity']): 'neutral' | 'warn' | 'good' {
  if (sev === 'high') return 'warn';
  if (sev === 'med') return 'warn';
  return 'good';
}

function findingTone(sev: OpsFinding['severity']): 'neutral' | 'warn' | 'good' {
  if (sev === 'high') return 'warn';
  if (sev === 'med') return 'warn';
  return 'good';
}

function formatUsd(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const v = Math.abs(amount);
  return `${sign}$${v.toFixed(2)}`;
}

function findingTitle(f: OpsFinding): string {
  const entity = f.entities.merchant ?? f.entities.category ?? '';
  const prefix =
    f.kind === 'vendor_concentration'
      ? 'Vendor concentration'
      : f.kind === 'category_spike'
        ? 'Category spike'
        : f.kind === 'duplicate_suspect'
          ? 'Duplicate suspect'
          : f.kind === 'high_frequency_merchant'
            ? 'High-frequency merchant'
            : 'Round-amount cluster';
  return entity ? `${prefix}: ${entity}` : prefix;
}

export default async function OpsPage(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = props.searchParams ?? {};
  const fallbackRange = defaultRangeFromDemo();
  const start = typeof sp.start === 'string' ? sp.start : fallbackRange.start;
  const end = typeof sp.end === 'string' ? sp.end : fallbackRange.end;
  const range: DateRange = { start, end };

  const { txns, source } = await loadTransactions(range);
  const analysis = analyzeOps(txns, range);
  const mosaicTiles: TreemapTile[] = buildTreemap(analysis.tiles, 'ops');
  const aiEnabled = parseBooleanEnv(process.env.NEXT_PUBLIC_AI_ENABLED, false);
  const dashboard = computeOpsDashboard({ txns, findings: analysis.findings, range });
  const capitalOneSignals = await loadCapitalOneSignals();

  return (
    <div className="pageStack" style={{ maxWidth: 1100 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Ops</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            Back-office risk, compliance, and reconciliation signals with decision support (AI
            optional).
          </div>
          <Badge tone={source === 'db' ? 'neutral' : 'good'}>
            {source === 'db' ? 'DB' : 'DEMO'}
          </Badge>
        </div>
      </div>

      <OpsDashboardCards dashboard={dashboard} />

      <Card>
        <CardHeader>
          <CardTitle>Range</CardTitle>
        </CardHeader>
        <CardBody>
          <form method="GET" className="buttonRow" style={{ alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <div className="small">Start</div>
              <input className="input" type="date" name="start" defaultValue={range.start} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <div className="small">End</div>
              <input className="input" type="date" name="end" defaultValue={range.end} />
            </label>
            <button className="btn btnPrimary" type="submit">
              Run Ops Analysis
            </button>
            <div className="small" style={{ opacity: 0.85 }}>
              {txns.length.toLocaleString()} transactions in range
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exception Mosaic</CardTitle>
        </CardHeader>
        <CardBody>
          {mosaicTiles.length ? (
            <MosaicView tiles={mosaicTiles} height={280} showHud={false} />
          ) : (
            <div className="small">No findings produced tiles for this range.</div>
          )}
        </CardBody>
      </Card>

      <OpsDecisionPanel
        dashboard={dashboard}
        findings={analysis.findings}
        range={range}
        aiEnabled={aiEnabled}
        capitalOneSignals={capitalOneSignals}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {analysis.briefs.map((brief) => (
          <Card key={brief.analyst}>
            <CardHeader>
              <CardTitle>
                {brief.analyst === 'risk'
                  ? 'Risk Analyst'
                  : brief.analyst === 'compliance'
                    ? 'Compliance Analyst'
                    : 'Reconciliation Analyst'}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="buttonRow" style={{ justifyContent: 'space-between' }}>
                <Badge tone={briefTone(brief.severity)}>{brief.severity.toUpperCase()}</Badge>
                <div className="small">{brief.findings.length} findings</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 650, marginBottom: 8 }}>Key bullets</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  {brief.bullets.map((b) => (
                    <li key={b} className="small">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 650, marginBottom: 8 }}>Next steps</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  {brief.nextSteps.map((s) => (
                    <li key={s} className="small">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardBody>
          {analysis.findings.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {analysis.findings.map((f) => (
                <div
                  key={f.id}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="buttonRow" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 650 }}>{findingTitle(f)}</div>
                    <div className="buttonRow">
                      <Badge>{f.analyst}</Badge>
                      <Badge tone={findingTone(f.severity)}>{f.severity}</Badge>
                    </div>
                  </div>
                  <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                    {f.why.join(' ')}
                  </div>
                  {typeof f.metrics.value === 'number' ? (
                    <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
                      Value: {formatUsd(f.metrics.value)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="small">No findings for this range.</div>
          )}
        </CardBody>
      </Card>

      <OpsMemoPanel briefs={analysis.briefs} range={range} aiEnabled={aiEnabled} />
    </div>
  );
}
