import { computeDemoArtifacts } from '../../../lib/analysis/compute';
import { getLatestAnalysisRun, insertAnalysisRun } from '../../../lib/analysis/storage';
import { hasSupabaseEnv } from '../../../lib/env';
import { envFlags } from '../../../lib/flags';
import { supabaseServer } from '../../../lib/supabase/server';
import { MosaicView } from '../../../components/MosaicView';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default async function MosaicPage(props: { searchParams: Promise<{ source?: string }> }) {
  const sp = await props.searchParams;
  const source = sp.source ?? 'demo';

  // Demo-safe default: render local fixtures. If a user is authenticated and schema exists,
  // cache the latest run for fast reloads.
  let artifacts = computeDemoArtifacts();
  let hasCache = false;

  if (source === 'demo' && !envFlags.demoMode && !envFlags.judgeMode && hasSupabaseEnv()) {
    try {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const latest = await getLatestAnalysisRun(supabase, user.id);
        if (latest) {
          artifacts = latest;
          hasCache = true;
        } else {
          await insertAnalysisRun(supabase, user.id, artifacts);
        }
      }
    } catch {
      // Ignore caching failures (schema not applied yet, etc).
    }
  }

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
            {artifacts.summary.transactionCount} transactions · $
            {artifacts.summary.totalSpend.toFixed(2)} spend
          </div>
        </div>
        <Badge tone="good">{hasCache ? 'Cached' : 'Demo Data'}</Badge>
      </div>

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>Month Mosaic</CardTitle>
          </CardHeader>
          <CardBody>
            <MosaicView tiles={artifacts.mosaic.tiles} />
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recurring</CardTitle>
            </CardHeader>
            <CardBody>
              <RecurringPanel recurring={artifacts.recurring} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <ActionsPanel actions={artifacts.actionPlan.slice(0, 5)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
