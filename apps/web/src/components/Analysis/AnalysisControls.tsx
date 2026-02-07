'use client';

import * as React from 'react';
import type { AnalysisSettings } from './types';
import { Button, Badge } from '../ui';

function isAnalyzePreset(v: string): v is AnalysisSettings['preset'] {
  return v === 'this_month' || v === 'last_month' || v === 'custom';
}

export function AnalysisControls(props: {
  settings: AnalysisSettings;
  setSettings: React.Dispatch<React.SetStateAction<AnalysisSettings>>;
  loading: boolean;
  onRecompute: () => void;
}) {
  const { settings, setSettings, loading, onRecompute } = props;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <label className="small" style={{ display: 'grid', gap: 4 }}>
        Range
        <select
          className="input"
          style={{ paddingTop: 8, paddingBottom: 8 }}
          value={settings.preset}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              preset: isAnalyzePreset(e.target.value) ? e.target.value : s.preset,
            }))
          }
        >
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {settings.preset === 'custom' ? (
        <>
          <label className="small" style={{ display: 'grid', gap: 4 }}>
            Start
            <input
              className="input"
              type="date"
              value={settings.customStart ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, customStart: e.target.value }))}
            />
          </label>
          <label className="small" style={{ display: 'grid', gap: 4 }}>
            End
            <input
              className="input"
              type="date"
              value={settings.customEnd ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, customEnd: e.target.value }))}
            />
          </label>
        </>
      ) : null}

      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={settings.filters.excludeTransfers}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              filters: { ...s.filters, excludeTransfers: e.target.checked },
            }))
          }
        />
        Exclude transfers
      </label>

      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={settings.filters.excludeRefunds}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              filters: { ...s.filters, excludeRefunds: e.target.checked },
            }))
          }
        />
        Exclude refunds
      </label>

      <Button variant="primary" onClick={onRecompute} disabled={loading}>
        {loading ? 'Computing…' : 'Recompute'}
      </Button>

      <Badge tone={loading ? 'warn' : 'neutral'}>{loading ? 'BUSY' : 'READY'}</Badge>
    </div>
  );
}
