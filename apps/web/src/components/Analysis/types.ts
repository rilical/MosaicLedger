import type { AnalyzePreset } from '../../lib/analysis/compute';

export type DataSourceKey = 'auto' | 'demo' | 'plaid' | 'nessie';

export type AnalysisSettings = {
  source?: DataSourceKey;
  // Persisted so Nessie can be used even with read-only keys (manual IDs).
  nessieCustomerId?: string;
  nessieAccountId?: string;
  preset: AnalyzePreset;
  customStart?: string;
  customEnd?: string;
  filters: {
    excludeTransfers: boolean;
    excludeRefunds: boolean;
  };
};
