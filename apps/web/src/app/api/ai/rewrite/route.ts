import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';

type RewriteRequest = {
  text?: string;
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

export async function POST(request: Request) {
  let body: RewriteRequest = {};
  try {
    body = (await request.json()) as RewriteRequest;
  } catch {
    body = {};
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ ok: false, error: 'missing text' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      rewrittenText: text,
      usedAI: false,
      error: 'missing_openai_api_key',
    });
  }

  // Gate: allow AI only when env enables it OR the caller explicitly opted in.
  // This keeps the default safe while letting the UI opt-in via a header.
  const aiEnabledEnv = parseBooleanEnv(process.env.NEXT_PUBLIC_AI_ENABLED, false);
  const forceAi = request.headers.get('x-ml-force-ai') === '1';
  if (!aiEnabledEnv && !forceAi) {
    return NextResponse.json({
      ok: true,
      rewrittenText: text,
      usedAI: false,
      error: 'ai_disabled (enable NEXT_PUBLIC_AI_ENABLED or send x-ml-force-ai: 1)',
    });
  }

  const { masked, originals } = maskNumbers(text);

  const style = body.style === 'concise' ? 'concise' : 'friendly';
  const system = [
    'You are MosaicLedger, a professional SaaS finance product.',
    'Task: rewrite short explanations for clarity and structure.',
    'Rules:',
    '- Do not add new numbers.',
    '- Preserve tokens like __NUM0__ exactly as written.',
    '- Keep meaning the same; only rewrite for clarity.',
    '- No hype, no emojis, no exclamation spam.',
    style === 'concise' ? '- Be concise.' : '- Be clear and friendly.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
      const apiMsg =
        json &&
        typeof json === 'object' &&
        'error' in (json as Record<string, unknown>) &&
        (json as { error?: unknown }).error &&
        typeof (json as { error?: unknown }).error === 'object' &&
        'message' in ((json as { error?: unknown }).error as Record<string, unknown>)
          ? String(((json as { error?: unknown }).error as { message?: unknown }).message)
          : null;
      return NextResponse.json({
        ok: true,
        rewrittenText: text,
        usedAI: false,
        error: `rewrite failed (${resp.status})${apiMsg ? `: ${apiMsg}` : ''}`,
      });
    }

    const restored = unmaskNumbers(content, originals);
    if (!restored) {
      return NextResponse.json({
        ok: true,
        rewrittenText: text,
        usedAI: false,
        error: 'rewrite changed numeric tokens',
      });
    }

    return NextResponse.json({ ok: true, rewrittenText: restored.trim(), usedAI: true });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'failed';
    return NextResponse.json({ ok: true, rewrittenText: text, usedAI: false, error: msg });
  } finally {
    clearTimeout(timeout);
  }
}
