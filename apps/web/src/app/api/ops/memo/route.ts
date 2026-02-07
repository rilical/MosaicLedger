import 'server-only';

import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';
import type { OpsBrief } from '@mosaicledger/contracts';

type OpsMemoRequest = {
  briefs?: OpsBrief[];
  range?: { start?: string; end?: string };
  style?: 'friendly' | 'concise';
};

function maskNumbers(input: string): { masked: string; originals: string[] } {
  const originals: string[] = [];
  const masked = input.replace(/(?:\$)?\d+(?:,\d{3})*(?:\.\d+)?%?/g, (m) => {
    const token = `__NUM${originals.length}__`;
    originals.push(m);
    return token;
  });
  return { masked, originals };
}

function unmaskNumbers(input: string, originals: string[]): string | null {
  let out = input;
  for (let i = 0; i < originals.length; i++) {
    const token = `__NUM${i}__`;
    if (!out.includes(token)) return null;
    out = out.split(token).join(originals[i]!);
  }
  return out;
}

function extractChatContent(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: unknown }).message;
  if (!msg || typeof msg !== 'object') return null;
  const content = (msg as { content?: unknown }).content;
  return typeof content === 'string' ? content : null;
}

function formatMemoDeterministic(params: {
  briefs: OpsBrief[];
  range?: { start?: string; end?: string };
}): string {
  const { briefs, range } = params;
  const lines: string[] = [];

  lines.push('Daily Ops Brief');
  if (range?.start && range?.end) lines.push(`Range: ${range.start} to ${range.end}`);
  lines.push('');

  const order: Array<OpsBrief['analyst']> = ['risk', 'compliance', 'recon'];
  const sorted = briefs.slice().sort((a, b) => order.indexOf(a.analyst) - order.indexOf(b.analyst));

  for (const brief of sorted) {
    const title =
      brief.analyst === 'risk'
        ? 'Risk Analyst'
        : brief.analyst === 'compliance'
          ? 'Compliance Analyst'
          : 'Reconciliation Analyst';
    lines.push(`${title} (${brief.severity.toUpperCase()})`);
    for (const b of (brief.bullets ?? []).slice(0, 6)) lines.push(`- ${b}`);
    lines.push('Next steps:');
    for (const s of (brief.nextSteps ?? []).slice(0, 6)) lines.push(`- ${s}`);
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export async function POST(request: Request) {
  let body: OpsMemoRequest = {};
  try {
    body = (await request.json()) as OpsMemoRequest;
  } catch {
    body = {};
  }

  const briefs = Array.isArray(body.briefs) ? body.briefs : [];
  if (!briefs.length) {
    return NextResponse.json({ ok: false, error: 'missing briefs' }, { status: 400 });
  }

  const memoDeterministic = formatMemoDeterministic({ briefs, range: body.range });

  const aiEnabled = parseBooleanEnv(process.env.NEXT_PUBLIC_AI_ENABLED, false);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!aiEnabled || !apiKey) {
    return NextResponse.json({ ok: true, memoText: memoDeterministic, usedAI: false });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const { masked, originals } = maskNumbers(memoDeterministic);
  const style = body.style === 'concise' ? 'concise' : 'friendly';

  const system = [
    'You rewrite ops analyst briefs for clarity.',
    'Rules:',
    '- Do not add new numbers.',
    '- Preserve tokens like __NUM0__ exactly as written.',
    '- Keep meaning the same; only rewrite for clarity.',
    style === 'concise' ? '- Be concise.' : '- Be clear and executive-friendly.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: masked },
        ],
      }),
      signal: controller.signal,
    });

    const json = (await resp.json()) as unknown;
    const content = extractChatContent(json);

    if (!resp.ok || !content) {
      return NextResponse.json({
        ok: true,
        memoText: memoDeterministic,
        usedAI: false,
        error: `rewrite failed (${resp.status})`,
      });
    }

    const restored = unmaskNumbers(content, originals);
    if (!restored) {
      return NextResponse.json({
        ok: true,
        memoText: memoDeterministic,
        usedAI: false,
        error: 'rewrite changed numeric tokens',
      });
    }

    return NextResponse.json({ ok: true, memoText: restored.trim() + '\n', usedAI: true });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'failed';
    return NextResponse.json({ ok: true, memoText: memoDeterministic, usedAI: false, error: msg });
  } finally {
    clearTimeout(timeout);
  }
}
