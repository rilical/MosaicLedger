import 'server-only';

import { NextResponse } from 'next/server';

function toHealthUrl(mcpUrl: string): string {
  const trimmed = mcpUrl.trim().replace(/\/+$/, '');
  // Common shape: https://host.tld/mcp
  if (trimmed.endsWith('/mcp')) return trimmed.replace(/\/mcp$/, '/health');
  return `${trimmed}/health`;
}

async function readJsonSafe(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

export async function GET() {
  const mcp = process.env.DEDALUS_MCP_SERVER_URL?.trim() ?? '';
  if (!mcp) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const healthUrl = toHealthUrl(mcp);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const resp = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
    const body = await readJsonSafe(resp);
    return NextResponse.json({
      ok: true,
      configured: true,
      healthUrl,
      status: resp.status,
      body,
    });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'name' in e && String((e as { name?: unknown }).name) === 'AbortError'
        ? 'timeout'
        : e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'request_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

