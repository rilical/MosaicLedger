import type { OpsDashboard } from '../../lib/ops/dashboard';
import { Card, CardBody, CardHeader, CardTitle, Badge } from '../ui';

function formatUsd(v: number): string {
  const x = Number(v);
  if (!Number.isFinite(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

function formatPct(p: number): string {
  const x = Number(p);
  if (!Number.isFinite(x)) return '0.0%';
  return `${(x * 100).toFixed(1)}%`;
}

function severityTone(score: number): 'good' | 'warn' | 'neutral' {
  if (score >= 70) return 'warn';
  if (score >= 40) return 'neutral';
  return 'good';
}

function Gauge(props: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(props.value)));
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = v / 100;
  const dash = c * pct;
  const tone = v >= 70 ? '#f97316' : v >= 40 ? '#38bdf8' : '#22c55e';

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" aria-label={`Risk score ${v}/100`}>
      <defs>
        <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.20)" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="url(#riskGrad)" stroke="rgba(255,255,255,0.10)" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="transparent"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={10}
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="transparent"
        stroke={tone}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="rgba(255,255,255,0.92)"
      >
        {v}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.60)">
        Risk score
      </text>
    </svg>
  );
}

function MiniBars(props: { items: Array<{ label: string; value: number }> }) {
  const items = props.items.slice(0, 6);
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((x) => (
        <div key={x.label} style={{ display: 'grid', gap: 4 }}>
          <div
            className="small"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {x.label}
            </span>
            <span>{formatUsd(x.value)}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(3, Math.round((x.value / max) * 100))}%`,
                background: 'linear-gradient(90deg, rgba(56,189,248,0.45), rgba(34,197,94,0.45))',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Sparkline(props: { series: Array<{ date: string; value: number }> }) {
  const pts = props.series.slice(-30);
  const w = 320;
  const h = 64;
  const pad = 8;
  const max = Math.max(1, ...pts.map((p) => p.value));
  const min = Math.min(0, ...pts.map((p) => p.value));
  const span = Math.max(1e-9, max - min);

  const xy = pts.map((p, i) => {
    const x = pad + (i / Math.max(1, pts.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.value - min) / span) * (h - pad * 2);
    return { x, y };
  });

  const d = xy
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-label="Daily spend sparkline">
      <defs>
        <linearGradient id="spendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(56,189,248,0.8)" />
          <stop offset="100%" stopColor="rgba(34,197,94,0.75)" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        rx="12"
        fill="rgba(0,0,0,0.16)"
        stroke="rgba(255,255,255,0.10)"
      />
      <path d={d} fill="none" stroke="url(#spendLine)" strokeWidth="2.5" />
    </svg>
  );
}

export function OpsDashboardCards(props: { dashboard: OpsDashboard }) {
  const { dashboard } = props;
  const k = dashboard.kpis;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Risk</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            className="buttonRow"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Badge tone={severityTone(k.riskScore)}>
              {k.riskScore >= 70 ? 'High' : k.riskScore >= 40 ? 'Medium' : 'Low'}
            </Badge>
            <div className="small">{k.findingsCount} findings</div>
          </div>
          <div style={{ display: 'grid', placeItems: 'center', marginTop: 10 }}>
            <Gauge value={k.riskScore} />
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            Exception rate:{' '}
            <span style={{ color: 'rgba(255,255,255,0.82)' }}>{formatPct(k.exceptionRate)}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend Trend</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            className="small"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
          >
            <span>Total spend</span>
            <span style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>
              {formatUsd(k.totalSpend)}
            </span>
          </div>
          <div
            className="small"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}
          >
            <span>Avg per day</span>
            <span style={{ color: 'rgba(255,255,255,0.86)' }}>{formatUsd(k.avgDailySpend)}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Sparkline series={dashboard.dailySpend} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
        </CardHeader>
        <CardBody>
          {dashboard.topMerchants.length ? (
            <MiniBars items={dashboard.topMerchants} />
          ) : (
            <div className="small">No spend in range.</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ops Forecast (30d)</CardTitle>
        </CardHeader>
        <CardBody>
          <div
            className="small"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
          >
            <span>Projected spend</span>
            <span style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>
              {formatUsd(dashboard.forecast30d.projectedSpend)}
            </span>
          </div>
          <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
            Based on {dashboard.forecast30d.basis.daysObserved} observed days in the selected range.
          </div>
          <div className="buttonRow" style={{ marginTop: 10 }}>
            <Badge tone="warn">High risk: {dashboard.forecast30d.projectedHighRiskEvents}</Badge>
            <Badge tone="neutral">
              Medium risk: {dashboard.forecast30d.projectedMedRiskEvents}
            </Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
