'use client';

import * as React from 'react';
import { MosaicView } from '../../../components/MosaicView';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  useAnalysisSettings,
  toAnalyzeRequest,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';

export default function MosaicPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <div>
          <div className="h1" style={{ fontSize: 20 }}>
            Mosaic
          </div>
          <div className="small">
            {artifacts
              ? `${artifacts.summary.transactionCount} transactions · $${artifacts.summary.totalSpend.toFixed(
                  2,
                )} spend`
              : 'Computing…'}
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

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>Month Mosaic</CardTitle>
          </CardHeader>
          <CardBody>
            <MosaicView tiles={artifacts?.mosaic.tiles ?? []} />
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recurring</CardTitle>
            </CardHeader>
            <CardBody>
              <RecurringPanel recurring={artifacts?.recurring ?? []} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <ActionsPanel actions={(artifacts?.actionPlan ?? []).slice(0, 5)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
