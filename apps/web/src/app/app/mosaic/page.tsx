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
  const topCategory = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0];
  const topCategoryName = topCategory?.[0] ?? 'n/a';
  const topCategorySpend = topCategory?.[1] ?? 0;

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <h1 className="pageTitle">Mosaic</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            {txns.length} transactions · ${summary.totalSpend.toFixed(2)} spend
          </div>
          <Badge tone="good">Demo Data</Badge>
        </div>
      </div>

      <div className="statGrid">
        <div className="statCard">
          <div className="statLabel">Monthly spend</div>
          <div className="statValue">${summary.totalSpend.toFixed(2)}</div>
          <div className="statSub">From demo fixture set</div>
        </div>
        <div className="statCard">
          <div className="statLabel">Average transaction</div>
          <div className="statValue">${(summary.totalSpend / txns.length).toFixed(2)}</div>
          <div className="statSub">Across {txns.length} entries</div>
        </div>
        <div className="statCard">
          <div className="statLabel">Top category</div>
          <div className="statValue">${topCategorySpend.toFixed(2)}</div>
          <div className="statSub">{topCategoryName}</div>
        </div>
      </div>

      <div className="filterBar">
        <div className="filterGroup">
          <div className="filterLabel">Month</div>
          <select className="input select filterSelect" defaultValue="2026-02">
            <option value="2026-02">February 2026</option>
            <option value="2026-01">January 2026</option>
            <option value="2025-12">December 2025</option>
          </select>
        </div>
        <div className="filterGroup">
          <div className="filterLabel">Category</div>
          <select className="input select filterSelect" defaultValue="all">
            <option value="all">All categories</option>
            <option value="housing">Housing</option>
            <option value="groceries">Groceries</option>
            <option value="transport">Transport</option>
          </select>
        </div>
        <div className="filterGroup">
          <div className="filterLabel">View</div>
          <select className="input select filterSelect" defaultValue="category">
            <option value="category">By category</option>
            <option value="merchant">By merchant</option>
          </select>
        </div>
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
