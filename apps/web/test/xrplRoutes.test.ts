import { describe, expect, it } from 'vitest';

describe('/api/xrpl/health', () => {
  it('reports simulate-only when env is missing', async () => {
    delete process.env.XRPL_TESTNET_SEED;
    delete process.env.XRPL_RPC_URL;

    const route = await import('../src/app/api/xrpl/health/route');
    const resp = await route.GET();
    const json = (await resp.json()) as Record<string, unknown>;

    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.configured).toBe(false);
  });
});

describe('/api/xrpl/send-roundup', () => {
  it('simulates deterministically', async () => {
    const route = await import('../src/app/api/xrpl/send-roundup/route');
    const resp = await route.POST(
      new Request('http://localhost/api/xrpl/send-roundup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountXrp: 1.25, memo: 'm', mode: 'simulate' }),
      }),
    );

    const json = (await resp.json()) as Record<string, unknown>;
    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
    const receipt = (json as { receipt?: unknown }).receipt as { txHash?: unknown } | undefined;
    expect(typeof receipt?.txHash).toBe('string');
    expect(String(receipt?.txHash)).toMatch(/^SIM_/);
  });

  it('refuses send when env is missing', async () => {
    delete process.env.XRPL_TESTNET_SEED;
    delete process.env.XRPL_RPC_URL;

    const route = await import('../src/app/api/xrpl/send-roundup/route');
    const resp = await route.POST(
      new Request('http://localhost/api/xrpl/send-roundup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountXrp: 1, memo: 'm', mode: 'send' }),
      }),
    );

    const json = (await resp.json()) as Record<string, unknown>;
    expect(resp.status).toBe(400);
    expect(json.ok).toBe(false);
  });
});
