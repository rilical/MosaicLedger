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
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="h1" style={{ fontSize: 20 }}>
            Recurring
          </div>
          <div className="small">{summary.recurring.length} detected recurring charges</div>
        </div>
        <Badge tone="good">Demo Data</Badge>
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
