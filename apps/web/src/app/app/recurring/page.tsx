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

export default function RecurringPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  const count = (artifacts?.recurring ?? []).length;

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Recurring</h1>
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
          <CardTitle>Detected Subscriptions</CardTitle>
        </CardHeader>
        <CardBody>
          <RecurringPanel recurring={artifacts?.recurring ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
