import type { AnalyzePreset } from '../../lib/analysis/compute';

export type AnalysisSettings = {
  preset: AnalyzePreset;
  customStart?: string;
  customEnd?: string;
  filters: {
    excludeTransfers: boolean;
    excludeRefunds: boolean;
  };
};
