import { getDemoTransactions } from '@mosaicledger/banking';
import {
  normalizeRawTransactions,
  recommendActions,
  summarizeTransactions,
} from '@mosaicledger/core';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default async function PlanPage(props: { searchParams: Promise<{ source?: string }> }) {
  const sp = await props.searchParams;
  const source = sp.source ?? 'demo';

  const raw = source === 'demo' ? getDemoTransactions() : getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });
  const summary = summarizeTransactions(txns);
  const actions = recommendActions(summary, {
    goalType: 'save_by_date',
    saveAmount: 200,
    byDate: '2026-04-01',
  });

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Plan</h1>
        <div className="pageMeta">
          <div className="pageTagline">Ranked next actions with quantified monthly savings</div>
          <Badge tone="good">Demo Data</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Actions</CardTitle>
        </CardHeader>
        <CardBody>
          <ActionsPanel actions={actions} />
        </CardBody>
      </Card>
    </div>
  );
}
