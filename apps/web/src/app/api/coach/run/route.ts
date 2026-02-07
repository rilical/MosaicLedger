import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeDemoArtifacts, type AnalyzeRequestV1 } from '../../../../lib/analysis/compute';
import type { ToolTraceStepV1, ToolTraceV1 } from '../../../../components/Trace/TraceDrawer';

const CoachRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(['advice', 'whatif', 'poster_audit']).default('advice'),
});

type CoachResponse = {
  ok: true;
  answer: string;
  coordinatorJson: unknown;
  modelsUsed: string[];
  toolsCalled: string[];
  trace: ToolTraceV1;
  vision?: unknown;
};

function nowIso(): string {
  return new Date().toISOString();
}

function redactForTrace(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v;
  // Shallow redaction for hackathon safety: avoid dumping full transactions/merchantRaw into traces.
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (key.includes('transactions')) continue;
    if (key.includes('merchantraw')) continue;
    if (key.includes('raw')) continue;
    out[k] = val;
  }
  return out;
}

function toolStepId(step: number, name: string): string {
  return `${step}_${name}`.replace(/[^a-zA-Z0-9_:-]/g, '_').slice(0, 80);
}

export async function POST(request: Request) {
  let bodyJson: unknown = null;
  try {
    bodyJson = await request.json();
  } catch {
    bodyJson = null;
  }

  const parsed = CoachRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const { message, mode } = parsed.data;

  const traceStartedAt = Date.now();
  const steps: ToolTraceStepV1[] = [];
  let stepCounter = 0;

  // Local cache for tool chaining within one run.
  let artifactsCache: ReturnType<typeof computeDemoArtifacts> | null = null;

  async function traced<T>(name: string, input: unknown, fn: () => Promise<T>): Promise<T> {
    const t0 = Date.now();
    stepCounter += 1;
    try {
      const out = await fn();
      const t1 = Date.now();
      steps.push({
        id: toolStepId(stepCounter, name),
        name,
        at: nowIso(),
        durationMs: t1 - t0,
        ok: true,
        input: redactForTrace(input),
        output: redactForTrace(out),
      });
      return out;
    } catch (e: unknown) {
      const t1 = Date.now();
      const msg = e instanceof Error ? e.message : 'tool_failed';
      steps.push({
        id: toolStepId(stepCounter, name),
        name,
        at: nowIso(),
        durationMs: t1 - t0,
        ok: false,
        input: redactForTrace(input),
        output: null,
        error: msg,
      });
      throw e;
    }
  }

  // Local tools.
  async function run_engine_analysis(requestJson: string) {
    const req: AnalyzeRequestV1 = (() => {
      try {
        return JSON.parse(requestJson) as AnalyzeRequestV1;
      } catch {
        return {};
      }
    })();

    return await traced('run_engine_analysis', { preset: req.preset }, async () => {
      // Hackathon-safe: use demo artifacts for the Coach toolchain.
      const artifacts = computeDemoArtifacts(req);
      artifactsCache = artifacts;
      return {
        version: artifacts.version,
        generatedAt: artifacts.generatedAt,
        summary: artifacts.summary,
        recurringCount: artifacts.recurring.length,
        actionCount: artifacts.actionPlan.length,
      };
    });
  }

  const trace: ToolTraceV1 = {
    version: 1,
    startedAt: nowIso(),
    totalMs: 0,
    steps: [],
  };

  // Vercel-first: deterministic Coach (no Dedalus dependency).
  await run_engine_analysis(JSON.stringify({ preset: 'this_month' }));
  const artifacts = artifactsCache ?? computeDemoArtifacts({});
  const top = (artifacts.actionPlan ?? []).slice(0, 3);

  const header =
    mode === 'poster_audit'
      ? 'Coach (deterministic): poster audit'
      : mode === 'whatif'
        ? 'Coach (deterministic): what-if'
        : 'Coach (deterministic): advice';

  const lines = [
    header,
    '',
    top.length
      ? 'Top actions (this month):'
      : 'No actions available for this range (demo dataset may be empty).',
    ...top.map(
      (a, idx) =>
        `- ${idx + 1}. ${a.title} (~$${a.expectedMonthlySavings.toFixed(2)}/mo)` +
        (a.explanation ? ` — ${a.explanation}` : ''),
    ),
  ];

  if (mode === 'poster_audit') {
    lines.push('', 'Poster audit is not available in this deployment.');
  }

  trace.totalMs = Date.now() - traceStartedAt;
  trace.steps = steps;

  const resp: CoachResponse = {
    ok: true,
    answer: lines.join('\n'),
    coordinatorJson: {
      mode: 'offline',
      modeRequested: mode,
      question: message,
      selected_action_ids: top.map((a) => a.id),
    },
    modelsUsed: [],
    toolsCalled: ['run_engine_analysis'],
    trace,
  };
  return NextResponse.json(resp);
}
