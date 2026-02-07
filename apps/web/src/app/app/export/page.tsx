'use client';

import * as React from 'react';
import type { ActionRecommendation } from '@mosaicledger/core';
import { exportToSvg, type ExportPlanItem } from '@mosaicledger/mosaic';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';
import { usePlanGoal } from '../../../components/Plan/usePlanGoal';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

function rangeLabel(settings: {
  preset: string;
  customStart?: string;
  customEnd?: string;
}): string {
  if (settings.preset === 'last_month') return 'Last month';
  if (settings.preset === 'custom' && settings.customStart && settings.customEnd) {
    return `Custom (${settings.customStart} to ${settings.customEnd})`;
  }
  return 'This month';
}

function toPlanItems(actions: ActionRecommendation[], privacyMode: boolean): ExportPlanItem[] {
  return actions.slice(0, 5).map((a) => {
    if (!privacyMode) return { title: a.title, savings: a.expectedMonthlySavings };

    if (a.actionType === 'cancel')
      return { title: 'Cancel a subscription', savings: a.expectedMonthlySavings };
    if (a.actionType === 'substitute')
      return { title: 'Swap a recurring delivery habit', savings: a.expectedMonthlySavings };
    if (a.actionType === 'cap') return { title: a.title, savings: a.expectedMonthlySavings };
    return { title: 'Reduce spend', savings: a.expectedMonthlySavings };
  });
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSvg(filename: string, svg: string) {
  downloadBlob(filename, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
}

async function downloadPng(filename: string, svg: string) {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG for PNG export'));
    });
    img.src = url;
    await loaded;

    const scale = 2;
    const w = (img.naturalWidth || 1000) * scale;
    const h = (img.naturalHeight || 900) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );

    if (blob) {
      downloadBlob(filename, blob);
      return;
    }

    // Safari fallback
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ExportPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const { goal } = usePlanGoal();

  const req = React.useMemo(() => ({ ...toAnalyzeRequest(settings), goal }), [settings, goal]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  const [privacyMode, setPrivacyMode] = React.useState(true);

  const svg = React.useMemo(() => {
    if (!artifacts) return null;
    return exportToSvg({
      title: 'MosaicLedger',
      rangeLabel: rangeLabel(settings),
      totalSpend: artifacts.summary.totalSpend,
      tiles: artifacts.mosaic.tiles,
      planItems: toPlanItems(artifacts.actionPlan ?? [], privacyMode),
      currency: 'USD',
    });
  }, [artifacts, privacyMode, settings]);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="h1" style={{ fontSize: 20 }}>
            Export
          </div>
          <div className="small">Poster export (SVG/PNG) of your Mosaic + Plan summary</div>
        </div>
        <Badge tone={error ? 'warn' : 'good'}>{error ? 'Error' : 'Ready'}</Badge>
      </div>

      <AnalysisControls
        settings={settings}
        setSettings={setSettings}
        loading={loading}
        onRecompute={() => void recompute()}
      />

      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={privacyMode}
          onChange={(e) => setPrivacyMode(e.target.checked)}
        />
        Privacy mode (redact merchant names in plan summary)
      </label>

      {error ? (
        <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Export Poster</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button
                variant="primary"
                onClick={() => {
                  if (!svg) return;
                  downloadSvg('mosaicledger-poster.svg', svg);
                }}
                disabled={!svg}
              >
                Download SVG
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (!svg) return;
                  void downloadPng('mosaicledger-poster.png', svg);
                }}
                disabled={!svg}
              >
                Download PNG
              </Button>
            </div>

            {svg ? (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.16)',
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="small">Run an analysis to generate an export preview.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
