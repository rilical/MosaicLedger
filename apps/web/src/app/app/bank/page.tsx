import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default function BankConnectPage() {
  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Connect Bank</h1>
        <div className="pageMeta">
          <div className="pageTagline">Plaid scaffolding for future live sync.</div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connect Bank (Scaffold)</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="small" style={{ display: 'grid', gap: 10 }}>
            <div>
              Plaid integration is intentionally not wired in this repo yet. The demo path must
              never depend on external APIs, provider approvals, or network reliability.
            </div>
            <div>
              Next steps live in:
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li>`packages/banking`: Plaid-first provider interface + demo fixtures</li>
                <li>`apps/web`: future `/api/plaid/*` routes (server-only)</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
