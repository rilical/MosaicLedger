'use client';

import * as React from 'react';
import type { AnalysisSettings } from './types';
import type { AnalyzeRequestV1 } from '../../lib/analysis/compute';

const STORAGE_KEY = 'mosaicledger.analysisSettings.v1';

const DEFAULT_SETTINGS: AnalysisSettings = {
  preset: 'this_month',
  filters: {
    excludeTransfers: true,
    excludeRefunds: true,
  },
};

function safeParse(raw: string | null): AnalysisSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v == null || typeof v !== 'object') return DEFAULT_SETTINGS;
    const obj = v as Record<string, unknown>;

    const preset =
      obj.preset === 'this_month' || obj.preset === 'last_month' || obj.preset === 'custom'
        ? obj.preset
        : DEFAULT_SETTINGS.preset;

    const customStart = typeof obj.customStart === 'string' ? obj.customStart : undefined;
    const customEnd = typeof obj.customEnd === 'string' ? obj.customEnd : undefined;

    const filtersObj = (obj.filters ?? {}) as Record<string, unknown>;
    const excludeTransfers =
      typeof filtersObj.excludeTransfers === 'boolean'
        ? filtersObj.excludeTransfers
        : DEFAULT_SETTINGS.filters.excludeTransfers;
    const excludeRefunds =
      typeof filtersObj.excludeRefunds === 'boolean'
        ? filtersObj.excludeRefunds
        : DEFAULT_SETTINGS.filters.excludeRefunds;

    return {
      preset,
      customStart,
      customEnd,
      filters: { excludeTransfers, excludeRefunds },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function toAnalyzeRequest(settings: AnalysisSettings): AnalyzeRequestV1 {
  return {
    preset: settings.preset,
    customRange:
      settings.preset === 'custom' && settings.customStart && settings.customEnd
        ? { start: settings.customStart, end: settings.customEnd }
        : undefined,
    filters: settings.filters,
  };
}

export function useAnalysisSettings(): {
  settings: AnalysisSettings;
  setSettings: React.Dispatch<React.SetStateAction<AnalysisSettings>>;
  resetSettings: () => void;
} {
  const [settings, setSettings] = React.useState<AnalysisSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    setSettings(safeParse(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const resetSettings = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, setSettings, resetSettings };
}
