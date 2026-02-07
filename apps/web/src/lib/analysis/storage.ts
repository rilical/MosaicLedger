import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisArtifactsV1 } from './types';

const RETAIN_RUNS = 10;

export async function getLatestAnalysisRun(
  supabase: SupabaseClient,
  userId: string,
): Promise<AnalysisArtifactsV1 | null> {
  type AnalysisRunRow = {
    created_at: string;
    source: string;
    summary_json: AnalysisArtifactsV1['summary'];
    mosaic_json: AnalysisArtifactsV1['mosaic'];
    recurring_json: AnalysisArtifactsV1['recurring'];
    action_plan_json: AnalysisArtifactsV1['actionPlan'];
  };

  const { data, error } = await supabase
    .from('analysis_runs')
    .select('summary_json,mosaic_json,recurring_json,action_plan_json,created_at,source')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as AnalysisRunRow;

  return {
    version: 1,
    generatedAt: row.created_at,
    source:
      row.source === 'demo' ||
      row.source === 'plaid' ||
      row.source === 'plaid_fixture' ||
      row.source === 'nessie'
        ? (row.source as AnalysisArtifactsV1['source'])
        : undefined,
    summary: row.summary_json,
    mosaic: row.mosaic_json,
    recurring: row.recurring_json,
    actionPlan: row.action_plan_json,
  };
}

export async function insertAnalysisRun(
  supabase: SupabaseClient,
  userId: string,
  artifacts: AnalysisArtifactsV1,
): Promise<void> {
  await supabase.from('analysis_runs').insert({
    user_id: userId,
    source: artifacts.source ?? 'engine',
    summary_json: artifacts.summary,
    mosaic_json: artifacts.mosaic,
    recurring_json: artifacts.recurring,
    action_plan_json: artifacts.actionPlan,
  });

  // Hackathon retention: keep only the latest N.
  const { data: old, error } = await supabase
    .from('analysis_runs')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(RETAIN_RUNS, 200);

  if (error || !old || old.length === 0) return;

  const ids = old.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return;

  await supabase.from('analysis_runs').delete().in('id', ids);
}
