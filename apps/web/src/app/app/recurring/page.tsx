'use client';

import * as React from 'react';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function RecurringPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  const count = (artifacts?.recurring ?? []).length;
  const upcoming = React.useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const end = addDays(now, 30);
    return (artifacts?.recurring ?? [])
      .filter((r) => r.nextDate >= now && r.nextDate <= end)
      .slice()
      .sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0));
  }, [artifacts?.recurring]);

  const upcomingTotal = React.useMemo(
    () => upcoming.reduce((sum, r) => sum + r.expectedAmount, 0),
    [upcoming],
  );

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <div className="pageMeta">
          <div className="pageTagline">{count} detected recurring charges</div>
          <Badge tone={error ? 'warn' : loading ? 'warn' : 'good'}>
            {error ? 'Error' : loading ? 'Busy' : 'Ready'}
          </Badge>
        </div>
      </div>

      <AnalysisControls
        settings={settings}
        setSettings={setSettings}
        loading={loading}
        onRecompute={() => void recompute()}
      />

      {error ? (
        <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Subscription Manager</CardTitle>
        </CardHeader>
        <CardBody>
          <RecurringPanel recurring={artifacts?.recurring ?? []} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bills (Next 30 Days)</CardTitle>
        </CardHeader>
        <CardBody>
          {upcoming.length === 0 ? (
            <div className="small">
              No upcoming predicted recurring charges in the next 30 days.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="small">
                Total upcoming: <strong>${upcomingTotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {upcoming.map((r) => (
                  <div
                    key={`up_${r.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 650 }}>{r.merchant}</div>
                      <div className="small">
                        {r.nextDate} · {r.cadence} · {(r.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="money">${r.expectedAmount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
