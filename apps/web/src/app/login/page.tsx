import Link from 'next/link';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';

export default function LoginPage() {
  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 650, marginBottom: 6 }}>Email</div>
              <input className="input" type="email" placeholder="you@domain.com" />
              <div className="small" style={{ marginTop: 8 }}>
                Magic link auth is the intended flow (Supabase), but the demo path does not require
                any keys.
              </div>
            </div>

            <div className="buttonRow">
              <Button variant="primary" type="button" disabled>
                Send magic link (scaffold)
              </Button>
              <Link className="btn" href="/app">
                Continue to demo
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
