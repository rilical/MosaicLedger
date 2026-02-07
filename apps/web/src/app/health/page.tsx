import { getDemoTransactions } from '@mosaicledger/banking';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { hasSupabaseEnv, parseBooleanEnv } from '../../lib/env';
import { hasPlaidEnv } from '../../lib/plaid/serverClient';
import { supabaseAdmin } from '../../lib/supabase/admin';

type CheckStatus = 'ok' | 'warn' | 'fail';

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
  if (!hasSupabaseEnv()) {
    return {
      name: 'Supabase',
      status: 'warn',
      detail:
        'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (demo is fine).',
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      name: 'Supabase service role',
      status: 'warn',
      detail: 'Missing SUPABASE_SERVICE_ROLE_KEY (required for privileged server writes).',
    };
  }

  try {
    const sb = supabaseAdmin();
    // Connectivity + schema sanity: try a lightweight query. If schema isn't applied yet, we warn.
    const { error } = await sb.from('analysis_runs').select('id').limit(1);
    if (error) {
      return {
        name: 'Supabase DB',
        status: 'warn',
        detail: `Reachable, but schema/policies may be missing (query error: ${error.code ?? 'unknown'}).`,
      };
    }
    return { name: 'Supabase DB', status: 'ok', detail: 'Reachable.' };
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'unknown';
    return { name: 'Supabase DB', status: 'fail', detail: `Not reachable (${msg}).` };
  }
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
          <div className="h1" style={{ fontSize: 20 }}>
            Health
          </div>
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
      </div>
    </main>
  );
}
