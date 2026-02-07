import Link from 'next/link';
import React, { Suspense } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { LoginForm } from '../../components/Auth/LoginForm';
import { hasSupabaseEnv } from '../../lib/env';

export default function LoginPage() {
  const supabaseConfigured = hasSupabaseEnv();
  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <div className="pageStack">
        <div className="pageHeader">
          <h1 className="pageTitle">Login</h1>
          <div className="pageMeta">
            <div className="pageTagline">Use a magic link to access your workspace.</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Magic link</CardTitle>
          </CardHeader>
          <CardBody>
            {supabaseConfigured ? (
              <Suspense fallback={<div className="small">Loading…</div>}>
                <LoginForm />
              </Suspense>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="small">
                  Supabase env vars are not configured yet. Demo path is enabled so you can still
                  ship a fail-safe hackathon demo.
                </div>
                <div className="buttonRow">
                  <Button variant="primary" type="button" disabled>
                    Send magic link (needs Supabase env)
                  </Button>
                  <Link className="btn" href="/app">
                    Continue to demo
                  </Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
