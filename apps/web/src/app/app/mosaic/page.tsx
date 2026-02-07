'use client';

import * as React from 'react';
import { MosaicView } from '../../../components/MosaicView';
import { MosaicSkeleton } from '../../../components/MosaicSkeleton';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';
import { useFlags } from '../../../lib/flags-client';

function stageLabel(stage: 'idle' | 'syncing' | 'analyzing' | 'rendering'): string {
  switch (stage) {
    case 'syncing':
      return 'Syncing';
    case 'analyzing':
      return 'Analyzing';
    case 'rendering':
      return 'Rendering';
    case 'idle':
      return 'Ready';
    default:
      return stage satisfies never;
  }
}

export default function MosaicPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, stage, isSlow, recompute } = useAnalysis(req);
  const { setFlag } = useFlags();

  const spend = artifacts?.summary.totalSpend ?? 0;
  const txCount = artifacts?.summary.transactionCount ?? 0;

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <h1 className="pageTitle">Mosaic</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            {artifacts ? `${txCount} transactions · $${spend.toFixed(2)} spend` : 'Computing…'}
          </div>
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

      {loading ? (
        <div className="filterBar" style={{ justifyContent: 'space-between' }}>
          <div className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stageLabel(stage)}…
          </div>
          {isSlow ? (
            <Button
              variant="ghost"
              onClick={() => {
                // One-click recovery: force deterministic demo path.
                setFlag('judgeMode', true);
                setFlag('demoMode', true);
                window.location.href = '/app/mosaic?source=demo';
              }}
            >
              Switch to demo data
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>Month Mosaic</CardTitle>
          </CardHeader>
          <CardBody>
            {!artifacts && loading ? (
              <MosaicSkeleton label={`${stageLabel(stage)}…`} />
            ) : (
              <MosaicView tiles={artifacts?.mosaic.tiles ?? []} />
            )}
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
