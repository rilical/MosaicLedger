import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Dedalus, { DedalusRunner } from 'dedalus-labs';
import { exportToSvg } from '@mosaicledger/mosaic';
import { simulateScenario, type ActionRecommendation } from '@mosaicledger/core';
import { computeDemoArtifacts, type AnalyzeRequestV1 } from '../../../../lib/analysis/compute';
import type { ToolTraceStepV1, ToolTraceV1 } from '../../../../components/Trace/TraceDrawer';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

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
  mcpServers: string[];
  trace: ToolTraceV1;
  vision?: unknown;
  usedDedalus: boolean;
};

let wasmInitPromise: Promise<void> | null = null;
let resvgModulePromise: Promise<typeof import('@resvg/resvg-wasm')> | null = null;

async function loadResvgModule(): Promise<typeof import('@resvg/resvg-wasm')> {
  // Keep this dynamic so Next's server bundle doesn't try to statically pull
  // in `index_bg.wasm` during `next build`.
  if (!resvgModulePromise) resvgModulePromise = import('@resvg/resvg-wasm');
  return resvgModulePromise;
}

async function ensureResvgWasm(): Promise<void> {
  if (wasmInitPromise) return wasmInitPromise;
  wasmInitPromise = (async () => {
    const { initWasm } = await loadResvgModule();
    const require = createRequire(import.meta.url);
    // Avoid a string literal inside `require.resolve(...)` so webpack doesn't
    // treat the wasm file as a build-time module dependency.
    const wasmSpecifier = ['@resvg/resvg-wasm', 'index_bg.wasm'].join('/');
    const wasmPath = require.resolve(wasmSpecifier);
    const wasm = await readFile(wasmPath);
    await initWasm(wasm);
  })();
  return wasmInitPromise;
}

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

  // Local tools (DedalusRunner executes these).
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

  async function list_actions(_: string) {
    return await traced('list_actions', {}, async () => {
      const artifacts = artifactsCache ?? computeDemoArtifacts({});
      artifactsCache = artifacts;
      return (artifacts.actionPlan ?? []).slice(0, 10).map((a) => ({ id: a.id, title: a.title }));
    });
  }

  async function simulate_scenario(beforeSpend: string, selectedActionIdsJson: string) {
    return await traced(
      'simulate_scenario',
      { beforeSpend, selectedActionIdsJsonLen: selectedActionIdsJson.length },
      async () => {
        const spend = Number(beforeSpend);
        const ids: string[] = (() => {
          try {
            const v = JSON.parse(selectedActionIdsJson) as unknown;
            return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
          } catch {
            return [];
          }
        })();

        const artifacts = artifactsCache ?? computeDemoArtifacts({});
        artifactsCache = artifacts;
        const selected: ActionRecommendation[] = (artifacts.actionPlan ?? []).filter((a) =>
          ids.includes(a.id),
        );
        return simulateScenario({ summary: { totalSpend: spend }, selectedActions: selected });
      },
    );
  }

  async function render_latest_poster_png(rangeLabel: string) {
    return await traced('render_latest_poster_png', { rangeLabel }, async () => {
      const artifacts = artifactsCache ?? computeDemoArtifacts({});
      artifactsCache = artifacts;

      const svg = exportToSvg({
        title: 'MosaicLedger',
        rangeLabel: rangeLabel || 'This month',
        totalSpend: artifacts.summary.totalSpend,
        tiles: artifacts.mosaic.tiles,
        planItems: (artifacts.actionPlan ?? []).slice(0, 5).map((a) => ({
          title: a.title,
          savings: a.expectedMonthlySavings,
        })),
        currency: 'USD',
      });

      await ensureResvgWasm();
      const { Resvg } = await loadResvgModule();
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 } });
      const pngBytes = resvg.render().asPng();
      const pngBase64 = Buffer.from(pngBytes).toString('base64');
      return {
        dataUrl: `data:image/png;base64,${pngBase64}`,
        width: resvg.width,
        height: resvg.height,
      };
    });
  }

  const trace: ToolTraceV1 = {
    version: 1,
    startedAt: nowIso(),
    totalMs: 0,
    steps: [],
  };

  const mcpServers = (
    process.env.DEDALUS_MCP_SERVER_URL ? [process.env.DEDALUS_MCP_SERVER_URL] : []
  )
    .map((s) => s.trim())
    .filter(Boolean);

  const usedDedalus = Boolean(process.env.DEDALUS_API_KEY);

  // Offline fallback: deterministic answer without network.
  if (!usedDedalus) {
    await run_engine_analysis(JSON.stringify({ preset: 'this_month' }));
    const artifacts = artifactsCache ?? computeDemoArtifacts({});

    const top = (artifacts.actionPlan ?? [])[0];
    const answer = top
      ? `Offline Coach (deterministic): Top action is "${top.title}" for ~$${top.expectedMonthlySavings.toFixed(
          2,
        )}/mo savings.`
      : `Offline Coach (deterministic): No actions available for this range.`;

    trace.totalMs = Date.now() - traceStartedAt;
    trace.steps = steps;

    const resp: CoachResponse = {
      ok: true,
      answer,
      coordinatorJson: { mode: 'offline', question: message },
      modelsUsed: [],
      toolsCalled: ['run_engine_analysis'],
      mcpServers: [],
      trace,
      usedDedalus: false,
    };
    return NextResponse.json(resp);
  }

  const client = new Dedalus({
    apiKey: process.env.DEDALUS_API_KEY,
    environment:
      (process.env.DEDALUS_ENV as 'production' | 'development' | undefined) ?? 'production',
    timeout: 20_000,
    maxRetries: 1,
  });
  const runner = new DedalusRunner(client, true);

  const coordinatorModel = process.env.DEDALUS_COORDINATOR_MODEL ?? 'openai/gpt-5-nano';
  const narratorModel = process.env.DEDALUS_NARRATOR_MODEL ?? 'openai/gpt-5';
  const visionModel = process.env.DEDALUS_VISION_MODEL ?? narratorModel;

  const instructions = [
    `You are MosaicCoach.`,
    `You must use tools for any numbers. Never invent numeric values.`,
    `Return a single JSON object with keys: answer_md (string), selected_action_ids (string[]), notes (string[]).`,
    `Tone: professional SaaS, crisp, no hype, no emojis.`,
    mode === 'poster_audit'
      ? `This is poster_audit mode. After tools generate a poster image, include a note to run a poster audit.`
      : `This is ${mode} mode.`,
  ].join('\n');

  let coordinatorOutput: unknown = null;
  let modelsUsed: string[] = [];
  let toolsCalled: string[] = [];
  let finalAnswer = '';
  let vision: unknown = undefined;

  try {
    const run = await runner.run({
      instructions,
      input: message,
      model: coordinatorModel,
      tools: [run_engine_analysis, list_actions, simulate_scenario, render_latest_poster_png],
      mcpServers,
      maxSteps: 8,
      autoExecuteTools: true,
      // Best-effort structured output (the model may still emit text; parse defensively).
      responseFormat: { type: 'json_object' },
    });

    type RunnerResultLike = {
      finalOutput: string;
      toolsCalled: string[];
      modelsUsed: Array<string | { model?: string }>;
    };
    const runResult = run as unknown as RunnerResultLike;

    toolsCalled = Array.isArray(runResult.toolsCalled) ? runResult.toolsCalled : [];
    modelsUsed = Array.isArray(runResult.modelsUsed)
      ? runResult.modelsUsed
          .map((m) => (typeof m === 'string' ? m : m.model))
          .filter((x): x is string => Boolean(x))
      : [];

    const raw = typeof runResult.finalOutput === 'string' ? runResult.finalOutput : '';
    try {
      coordinatorOutput = JSON.parse(raw) as unknown;
    } catch {
      coordinatorOutput = { answer_md: raw, selected_action_ids: [], notes: ['non_json_output'] };
    }

    if (mode === 'poster_audit') {
      const poster = await render_latest_poster_png('This month');
      const visionResp = await client.chat.completions.create({
        model: visionModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a poster auditor. Identify the top visible labels/colors and any obvious layout anomalies. Return JSON with keys: visible_labels (string[]), anomaly_notes (string[]).',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Audit this MosaicLedger poster image.' },
              { type: 'image_url', image_url: { url: poster.dataUrl, detail: 'low' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const vText = visionResp.choices?.[0]?.message?.content ?? '';
      try {
        vision = JSON.parse(String(vText));
      } catch {
        vision = { visible_labels: [], anomaly_notes: [String(vText).slice(0, 200)] };
      }
      modelsUsed = Array.from(new Set([...modelsUsed, String(visionModel)]));
    }

    // Narrator handoff: rewrite, but do not change numbers.
    const narrator = await client.chat.completions.create({
      model: narratorModel,
      messages: [
        {
          role: 'system',
          content:
            'You are MosaicLedger (professional SaaS). Rewrite the provided JSON into a concise answer for a finance demo. Do not change any numbers or IDs. Use markdown bullets. No hype, no emojis. Output text only.',
        },
        {
          role: 'user',
          content: JSON.stringify({ coordinator: coordinatorOutput, vision }, null, 2),
        },
      ],
    });

    const narr = narrator.choices?.[0]?.message?.content ?? '';
    finalAnswer = typeof narr === 'string' ? narr : String(narr ?? '');
    modelsUsed = Array.from(new Set([...modelsUsed, String(narratorModel)]));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'coach_failed';
    finalAnswer = `Coach failed (${msg}). Falling back to deterministic offline answer.`;
    coordinatorOutput = { error: msg };
  }

  trace.totalMs = Date.now() - traceStartedAt;
  trace.steps = steps;

  const resp: CoachResponse = {
    ok: true,
    answer: finalAnswer,
    coordinatorJson: coordinatorOutput,
    modelsUsed,
    toolsCalled,
    mcpServers,
    trace,
    vision,
    usedDedalus: true,
  };
  return NextResponse.json(resp);
}
