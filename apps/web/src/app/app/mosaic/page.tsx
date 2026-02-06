import { getDemoTransactions } from '@mosaicledger/banking';
import {
  normalizeRawTransactions,
  recommendActions,
  summarizeTransactions,
} from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import { MosaicView } from '../../../components/MosaicView';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default async function MosaicPage(props: { searchParams: Promise<{ source?: string }> }) {
  const sp = await props.searchParams;
  const source = sp.source ?? 'demo';

  // Demo-safe default: always render local fixtures unless explicitly overridden later.
  const raw = source === 'demo' ? getDemoTransactions() : getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });

  const summary = summarizeTransactions(txns);
  const tiles = buildTreemapTiles(summary.byCategory);
  const actions = recommendActions(summary, {
    goalType: 'save_by_date',
    saveAmount: 200,
    byDate: '2026-04-01',
  });

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
            {txns.length} transactions · ${summary.totalSpend.toFixed(2)} spend
          </div>
        </div>
        <Badge tone="good">Demo Data</Badge>
      </div>

      <div className="grid">
        <Card>
          <CardHeader>
            <CardTitle>Month Mosaic</CardTitle>
          </CardHeader>
          <CardBody>
            <MosaicView tiles={tiles} />
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recurring</CardTitle>
            </CardHeader>
            <CardBody>
              <RecurringPanel recurring={summary.recurring} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <ActionsPanel actions={actions.slice(0, 5)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
