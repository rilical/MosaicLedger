import { NextResponse } from 'next/server';

function safeHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return url.slice(0, 80);
  }
}

export async function GET() {
  const rpcUrl = process.env.XRPL_RPC_URL?.trim() || '';
  const hasSeed = Boolean(process.env.XRPL_TESTNET_SEED?.trim());
  const configured = hasSeed && Boolean(rpcUrl);

  return NextResponse.json({
    ok: true,
    configured,
    rpcHost: rpcUrl ? safeHost(rpcUrl) : null,
    destinationConfigured: Boolean(process.env.XRPL_DESTINATION?.trim()),
  });
}
