'use client';

import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from '../../components/ui';
import { useFlags } from '../../lib/flags-client';

export default function ConnectPage() {
  const router = useRouter();
  const { flags } = useFlags();

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Connect</h1>
        <div className="pageMeta">
          <div className="pageTagline">Pick a data source to start the demo flow.</div>
          <Badge tone="good">Demo-first</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Choose a Data Source</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="small">
              Bank sync is optional and may fail live. Demo data is the always-works path and is
              what the deterministic engine is tested against in CI.
            </div>

            <div className="buttonRow">
              <Button
                variant="primary"
                disabled={!flags.plaidEnabled}
                onClick={() => router.push('/app/bank')}
              >
                Connect Bank (Plaid)
              </Button>

              <Button onClick={() => router.push('/app/mosaic?source=demo')}>Use Demo Data</Button>

              {flags.demoMode ? (
                <Badge tone="good">Demo Mode default ON</Badge>
              ) : (
                <Badge>Demo OFF</Badge>
              )}
              {flags.judgeMode ? <Badge tone="warn">Judge Mode ON</Badge> : null}
            </div>

            {!flags.plaidEnabled ? (
              <div className="small">
                Plaid is currently disabled. Toggle it in Settings or set
                `NEXT_PUBLIC_PLAID_ENABLED=1`.
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What You Get</CardTitle>
        </CardHeader>
        <CardBody>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            <li>Mosaic mural (treemap) as primary navigation surface</li>
            <li>Recurring detection with predicted next charges</li>
            <li>Ranked action plan with quantified monthly savings</li>
            <li>Deterministic core engine (AI never required)</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
