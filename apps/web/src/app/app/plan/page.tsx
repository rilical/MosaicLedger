'use client';

import * as React from 'react';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  useAnalysisSettings,
  toAnalyzeRequest,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';

export default function PlanPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Plan</h1>
        <div className="pageMeta">
          <div className="pageTagline">Ranked next actions with quantified monthly savings</div>
          <Badge tone="good">Demo Data</Badge>
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
          <CardTitle>Top Actions</CardTitle>
        </CardHeader>
        <CardBody>
          <ActionsPanel actions={artifacts?.actionPlan ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
