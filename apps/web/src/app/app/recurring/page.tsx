'use client';

import * as React from 'react';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  useAnalysisSettings,
  toAnalyzeRequest,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';

export default function RecurringPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="h1" style={{ fontSize: 20 }}>
            Recurring
          </div>
          <div className="small">
            {(artifacts?.recurring ?? []).length} detected recurring charges
          </div>
        </div>
        <Badge tone={error ? 'warn' : 'good'}>{error ? 'Error' : 'Live'}</Badge>
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
          <CardTitle>Detected Subscriptions</CardTitle>
        </CardHeader>
        <CardBody>
          <RecurringPanel recurring={artifacts?.recurring ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
