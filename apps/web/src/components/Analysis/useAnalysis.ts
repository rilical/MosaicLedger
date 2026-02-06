'use client';

import * as React from 'react';
import type { AnalysisArtifactsV1 } from '../../lib/analysis/types';
import type { AnalyzeRequestV1 } from '../../lib/analysis/compute';

type AnalyzeResponse =
  | { ok: true; artifacts: AnalysisArtifactsV1; stored?: boolean }
  | { ok: false; error?: string };

function readError(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  if (!('error' in json)) return null;
  const v = (json as { error?: unknown }).error;
  return v == null ? null : String(v);
}

export function useAnalysis(req: AnalyzeRequestV1): {
  artifacts: AnalysisArtifactsV1 | null;
  loading: boolean;
  error: string | null;
  recompute: () => Promise<void>;
} {
  const [artifacts, setArtifacts] = React.useState<AnalysisArtifactsV1 | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const recompute = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/engine/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
      });
      const json = (await resp.json()) as unknown as AnalyzeResponse;
      if (!resp.ok || !json.ok) {
        const msg = readError(json);
        throw new Error(msg ?? `Analyze failed (${resp.status})`);
      }
      setArtifacts(json.artifacts ?? null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Analyze failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [req]);

  React.useEffect(() => {
    void recompute();
  }, [recompute]);

  return { artifacts, loading, error, recompute };
}
