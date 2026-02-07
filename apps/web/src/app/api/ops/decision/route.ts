import 'server-only';

import { NextResponse } from 'next/server';
import { parseBooleanEnv } from '../../../../lib/env';

type OpsDecisionRequest = {
  dashboard?: unknown;
  range?: { start?: string; end?: string };
  topFindings?: unknown[];
  style?: 'exec' | 'concise';
};

type OpsDashboardLike = {
  kpis?: {
    txnsCount?: number;
    findingsCount?: number;
    exceptionRate?: number;
    totalSpend?: number;
    avgDailySpend?: number;
    riskScore?: number;
  };
  forecast30d?: {
    projectedSpend?: number;
    projectedHighRiskEvents?: number;
    projectedMedRiskEvents?: number;
  };
};

type FindingLike = {
  analyst?: string;
  kind?: string;
  severity?: string;
  why?: unknown;
  entities?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

function extractChatContent(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: unknown }).message;
  if (!msg || typeof msg !== 'object') return null;
  const content = (msg as { content?: unknown }).content;
  return typeof content === 'string' ? content : null;
}

function safeNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

function formatDecisionDeterministic(params: {
  dashboard: OpsDashboardLike;
  range?: { start?: string; end?: string };
  topFindings: FindingLike[];
}): string {
  const { dashboard, range, topFindings } = params;
  const k = dashboard.kpis ?? {};
  const forecast = dashboard.forecast30d ?? {};

  const lines: string[] = [];
  lines.push('BNY Back-Office Decision Brief');
  if (range?.start && range?.end) lines.push(`Range: ${range.start} to ${range.end}`);
  lines.push('');

  const riskScore = safeNumber(k.riskScore) ?? 0;
  const totalSpend = safeNumber(k.totalSpend) ?? 0;
  const txnsCount = safeNumber(k.txnsCount) ?? 0;
  const findingsCount = safeNumber(k.findingsCount) ?? 0;
  const exceptionRate = safeNumber(k.exceptionRate) ?? 0;

  const projectedSpend = safeNumber(forecast.projectedSpend) ?? 0;
  const projectedHi = safeNumber(forecast.projectedHighRiskEvents) ?? 0;
  const projectedMed = safeNumber(forecast.projectedMedRiskEvents) ?? 0;

  lines.push('Snapshot');
  lines.push(`- Risk score: ${Math.round(riskScore)}/100`);
  lines.push(`- Transactions analyzed: ${Math.round(txnsCount)}`);
  lines.push(
    `- Findings: ${Math.round(findingsCount)} (exception rate ${(exceptionRate * 100).toFixed(1)}%)`,
  );
  lines.push(`- Spend (range): ${formatUsd(totalSpend)}`);
  lines.push(
    `- 30d projection: ${formatUsd(projectedSpend)} spend, ${Math.round(projectedHi)} high-risk, ${Math.round(projectedMed)} medium-risk`,
  );
  lines.push('');

  lines.push('Top Decisions (do these first)');
  const top = Array.isArray(topFindings) ? topFindings.slice(0, 6) : [];
  if (!top.length) {
    lines.push(
      '- No findings in range. Consider expanding the date range or using a live data source.',
    );
  } else {
    for (const f of top) {
      const sev = String(f?.severity ?? 'low');
      const analyst = String(f?.analyst ?? 'ops');
      const kind = String(f?.kind ?? 'finding');
      const entity =
        (f?.entities &&
          typeof f.entities === 'object' &&
          (f.entities.merchant || f.entities.category)) ||
        '';
      const title = entity ? `${kind}: ${String(entity)}` : kind;
      lines.push(`- [${sev.toUpperCase()} | ${analyst}] ${title}`);
      const why = Array.isArray(f?.why) ? (f.why as unknown[]).slice(0, 1).join(' ') : '';
      if (why) lines.push(`  - Why: ${why}`);
      lines.push('  - Decision: assign owner, verify source-of-truth, document outcome.');
    }
  }
  lines.push('');

  lines.push('Controls / Process Suggestions');
  lines.push(
    '- Reconciliation: add a daily exception queue; auto-link suspected duplicates for human review.',
  );
  lines.push(
    '- Compliance: flag category spikes against policy thresholds; require annotation for overrides.',
  );
  lines.push('- Risk: monitor vendor concentration; add approval gates for high-exposure vendors.');
  lines.push('');

  lines.push('Note');
  lines.push(
    '- This is a demo-grade decision support tool. Use it to surface the right info at the right time; do not treat as financial advice.',
  );

  return lines.join('\n').trim() + '\n';
}

export async function POST(request: Request) {
  let body: OpsDecisionRequest = {};
  try {
    body = (await request.json()) as OpsDecisionRequest;
  } catch {
    body = {};
  }

  const dashboard = body.dashboard;
  const topFindings = Array.isArray(body.topFindings) ? body.topFindings : [];
  const range = body.range;

  if (!dashboard || typeof dashboard !== 'object') {
    return NextResponse.json({ ok: false, error: 'missing dashboard' }, { status: 400 });
  }

  const deterministic = formatDecisionDeterministic({
    dashboard: dashboard as OpsDashboardLike,
    range,
    topFindings: topFindings as FindingLike[],
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: true, text: deterministic, usedAI: false });

  const aiEnabledEnv = parseBooleanEnv(process.env.NEXT_PUBLIC_AI_ENABLED, false);
  const forceAi = request.headers.get('x-ml-force-ai') === '1';
  if (!aiEnabledEnv && !forceAi) {
    return NextResponse.json({
      ok: true,
      text: deterministic,
      usedAI: false,
      error: 'ai_disabled (enable NEXT_PUBLIC_AI_ENABLED or send x-ml-force-ai: 1)',
    });
  }

  const style = body.style === 'concise' ? 'concise' : 'exec';
  const system = [
    'You are MosaicLedger Ops, an AI-powered back-office assistant for financial services.',
    'Your job: help a human analyst make better operational decisions (risk, compliance, reconciliation).',
    'Constraints:',
    '- Do not invent numbers. Use only numbers already present in the input.',
    '- Keep it professional and decision-oriented.',
    '- Output plain text with sections and bullet points.',
    style === 'concise' ? '- Be concise.' : '- Be executive-ready and actionable.',
  ].join('\n');

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

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
          { role: 'user', content: deterministic },
        ],
      }),
      signal: controller.signal,
    });

    const json = (await resp.json()) as unknown;
    const content = extractChatContent(json);
    if (!resp.ok || !content) {
      return NextResponse.json({
        ok: true,
        text: deterministic,
        usedAI: false,
        error: `decision failed (${resp.status})`,
      });
    }

    return NextResponse.json({ ok: true, text: content.trim() + '\n', usedAI: true });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : 'failed';
    return NextResponse.json({ ok: true, text: deterministic, usedAI: false, error: msg });
  } finally {
    clearTimeout(timeout);
  }
}
