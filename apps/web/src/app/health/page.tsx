import { getDemoTransactions } from '@mosaicledger/banking';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { parseBooleanEnv } from '../../lib/env';
import { hasPlaidEnv } from '../../lib/plaid/serverClient';
import { checkSchema, type SchemaStatus } from '../../lib/db/schemaCheck';
import { getPlaidLastSync } from '../../lib/plaid/status';

type CheckStatus = SchemaStatus;

type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
};

function toneFor(status: CheckStatus): 'neutral' | 'good' | 'warn' {
  switch (status) {
    case 'ok':
      return 'good';
    case 'warn':
    case 'fail':
      return 'warn';
    default:
      return status satisfies never;
  }
}

function labelFor(status: CheckStatus): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'warn':
      return 'WARN';
    case 'fail':
      return 'FAIL';
    default:
      return status satisfies never;
  }
}

async function checkSupabaseDb(): Promise<Check> {
  const schema = await checkSchema();
  const worst =
    schema.find((c) => c.status === 'fail')?.status ??
    schema.find((c) => c.status === 'warn')?.status ??
    'ok';
  const detail =
    worst === 'ok'
      ? 'Schema OK.'
      : 'Schema missing or incomplete. Apply supabase/schema.sql and refresh /health.';

  return { name: 'Supabase schema', status: worst, detail };
}

export default async function HealthPage() {
  const judgeMode = parseBooleanEnv(process.env.NEXT_PUBLIC_JUDGE_MODE, false);
  const demoMode = parseBooleanEnv(process.env.NEXT_PUBLIC_DEMO_MODE, true);

  const demoTxns = (() => {
    try {
      const raw = getDemoTransactions();
      return raw.length;
    } catch {
      return 0;
    }
  })();

  const schemaChecks = await checkSchema();
  const plaidSync = await getPlaidLastSync();

  // "Presence checks only" rule: we never display secret values, only present/missing.
  const checks: Check[] = [
    {
      name: 'Demo dataset',
      status: demoTxns > 0 ? 'ok' : 'fail',
      detail: demoTxns > 0 ? `Loaded ${demoTxns} demo transactions.` : 'Demo dataset missing.',
    },
    await checkSupabaseDb(),
    {
      name: 'Plaid env',
      status: hasPlaidEnv() ? 'ok' : 'warn',
      detail: hasPlaidEnv()
        ? 'PLAID_CLIENT_ID/PLAID_SECRET/PLAID_ENV present.'
        : 'Missing Plaid env (demo is fine).',
    },
    {
      name: 'Plaid last sync',
      status: plaidSync.status,
      detail: plaidSync.detail,
    },
    {
      name: 'Dedalus (optional)',
      status: process.env.DEDALUS_API_KEY ? 'ok' : 'warn',
      detail: process.env.DEDALUS_API_KEY
        ? 'DEDALUS_API_KEY present.'
        : 'Missing DEDALUS_API_KEY (optional).',
    },
    {
      name: 'AI rewrite key',
      status: process.env.OPENAI_API_KEY ? 'ok' : 'warn',
      detail: process.env.OPENAI_API_KEY
        ? 'OPENAI_API_KEY present.'
        : 'Missing OPENAI_API_KEY (AI rewrite will fall back to original text).',
    },
    {
      name: 'XRPL testnet',
      status: process.env.XRPL_TESTNET_SEED && process.env.XRPL_RPC_URL ? 'ok' : 'warn',
      detail:
        process.env.XRPL_TESTNET_SEED && process.env.XRPL_RPC_URL
          ? 'XRPL_TESTNET_SEED and XRPL_RPC_URL present.'
          : 'Missing XRPL env (simulate-only is fine).',
    },
  ];

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <main className="container" style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 20 }}>
            Health
          </h1>
          <div className="small">Presence checks only. No secrets are displayed.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge tone={demoMode ? 'good' : 'neutral'}>DEMO {demoMode ? 'ON' : 'OFF'}</Badge>
          <Badge tone={judgeMode ? 'warn' : 'neutral'}>JUDGE {judgeMode ? 'ON' : 'OFF'}</Badge>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Badge tone={failCount > 0 ? 'warn' : 'good'}>{failCount} FAIL</Badge>
              <Badge tone={warnCount > 0 ? 'warn' : 'good'}>{warnCount} WARN</Badge>
              <Badge tone="good">{okCount} OK</Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checks</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="small">
                DB schema status is computed using server-only Supabase admin queries. If you see a
                FAIL, apply `supabase/schema.sql` in the Supabase SQL editor and refresh.
              </div>
              {checks.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: 12,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div className="small">{c.detail}</div>
                  </div>
                  <div>
                    <Badge tone={toneFor(c.status)}>{labelFor(c.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schema Details</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gap: 10 }}>
              {schemaChecks.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: 12,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div className="small">{c.detail}</div>
                  </div>
                  <div>
                    <Badge tone={toneFor(c.status)}>{labelFor(c.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
