import { getDemoTransactions } from '@mosaicledger/banking';
import { normalizeRawTransactions, summarizeTransactions } from '@mosaicledger/core';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default async function RecurringPage(props: { searchParams: Promise<{ source?: string }> }) {
  const sp = await props.searchParams;
  const source = sp.source ?? 'demo';

  const raw = source === 'demo' ? getDemoTransactions() : getDemoTransactions();
  const txns = normalizeRawTransactions(raw, { source: 'demo' });
  const summary = summarizeTransactions(txns);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Recurring</h1>
        <div className="pageMeta">
          <div className="pageTagline">
            {(artifacts?.recurring ?? []).length} detected recurring charges
          </div>
          <Badge tone="good">Demo Data</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detected Subscriptions</CardTitle>
        </CardHeader>
        <CardBody>
          <RecurringPanel recurring={summary.recurring} />
        </CardBody>
      </Card>
    </div>
  );
}
