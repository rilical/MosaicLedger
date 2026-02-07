'use client';

import * as React from 'react';
import type { ActionRecommendation, RecurringCharge } from '@mosaicledger/core';
import type { AnalysisArtifactsV1 } from '../../lib/analysis/types';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../ui';
import { Drawer } from '../ui/Drawer';
import { useFlags } from '../../lib/flags-client';
import { parseIntent } from './intent';
import { TraceDrawer, type ToolTraceV1 } from '../Trace/TraceDrawer';

type CoachTurn = {
  id: string;
  at: string; // ISO
  question: string;
  intent: unknown;
  answer: string;
  recommendedActionIds: string[];
  recommendedActionTitles: Record<string, string>;
  ai?: { rewritten?: string; usedAI?: boolean; error?: string };
  trace?: ToolTraceV1;
};

const STORAGE_KEY = 'mosaicledger.coachHistory.v1';

type SafetyResult =
  | { kind: 'ok' }
  | { kind: 'blocked'; answer: string; reason: string }
  | { kind: 'limited'; answer: string; reason: string };

function stableId(parts: string[]): string {
  return parts
    .join('|')
    .replace(/[^a-zA-Z0-9_|:-]/g, '_')
    .slice(0, 80);
}

function safeParseTurns(raw: string | null): CoachTurn[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: CoachTurn[] = [];
    for (const t of v.slice(-10)) {
      if (!t || typeof t !== 'object') continue;
      const obj = t as Record<string, unknown>;
      if (typeof obj.question !== 'string' || typeof obj.answer !== 'string') continue;
      out.push({
        id: typeof obj.id === 'string' ? obj.id : stableId(['turn', obj.question]),
        at: typeof obj.at === 'string' ? obj.at : new Date().toISOString(),
        question: obj.question,
        intent: obj.intent ?? { kind: 'unknown' },
        answer: obj.answer,
        recommendedActionIds: Array.isArray(obj.recommendedActionIds)
          ? obj.recommendedActionIds.filter((x) => typeof x === 'string')
          : [],
        recommendedActionTitles:
          obj.recommendedActionTitles && typeof obj.recommendedActionTitles === 'object'
            ? (obj.recommendedActionTitles as Record<string, string>)
            : {},
        ai: obj.ai && typeof obj.ai === 'object' ? (obj.ai as CoachTurn['ai']) : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatUpcoming(recurring: RecurringCharge[]): { list: RecurringCharge[]; total: number } {
  const now = new Date().toISOString().slice(0, 10);
  const end = addDays(now, 30);
  const list = recurring
    .filter((r) => r.nextDate >= now && r.nextDate <= end)
    .slice()
    .sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0));
  const total = list.reduce((sum, r) => sum + r.expectedAmount, 0);
  return { list, total };
}

function chooseRecommendedActions(params: {
  actions: ActionRecommendation[];
  recurring: RecurringCharge[];
  intent: ReturnType<typeof parseIntent>;
}): ActionRecommendation[] {
  const { actions, recurring, intent } = params;

  if (intent.kind === 'subscriptions') {
    const recurringMerchants = new Set(recurring.map((r) => r.merchant));
    return actions
      .filter((a) => a.actionType === 'cancel' && a.target.kind === 'merchant')
      .filter((a) => recurringMerchants.has(a.target.value))
      .slice(0, 3);
  }

  if (intent.kind === 'category_caps') {
    return actions.filter((a) => a.actionType === 'cap').slice(0, 3);
  }

  if (intent.kind === 'find_savings') {
    return actions.slice(0, 3);
  }

  return actions.slice(0, 2);
}

function buildDeterministicAnswer(params: {
  question: string;
  intent: ReturnType<typeof parseIntent>;
  artifacts: AnalysisArtifactsV1;
  recommended: ActionRecommendation[];
}): string {
  const { question, intent, artifacts, recommended } = params;

  const spend = artifacts.summary.totalSpend;
  const txCount = artifacts.summary.transactionCount;
  const recurring = artifacts.recurring;

  const upcoming = formatUpcoming(recurring);

  switch (intent.kind) {
    case 'subscriptions': {
      const top = recurring.slice(0, 5);
      if (top.length === 0) {
        return `I did not detect any recurring charges in the selected range. If you switch to a longer range (Last month or Custom), recurring patterns are easier to spot.`;
      }
      const lines = top.map(
        (r) =>
          `- ${r.merchant}: ~$${r.expectedAmount.toFixed(2)}/${r.cadence} (next ${r.nextDate}, ${(r.confidence * 100).toFixed(0)}%)`,
      );
      return [
        `Recurring summary: ${top.length} top recurring merchants detected.`,
        `Upcoming 30-day recurring total: $${upcoming.total.toFixed(2)}.`,
        `Top recurring items:`,
        ...lines,
        recommended.length
          ? `Recommended next action: ${recommended[0]!.title} (saves ~$${recommended[0]!.expectedMonthlySavings.toFixed(2)}/mo).`
          : `Recommended next action: open the Subscription Manager and mark Keep/Cancel/Downgrade to shape the plan.`,
      ].join('\n');
    }
    case 'upcoming_bills': {
      if (!upcoming.list.length) {
        return `No predicted recurring charges in the next 30 days based on current detection. Try Last month or Custom range to strengthen recurring signals.`;
      }
      const lines = upcoming.list
        .slice(0, 6)
        .map((r) => `- ${r.nextDate}: ${r.merchant} ($${r.expectedAmount.toFixed(2)})`);
      return [
        `Upcoming obligations (next 30 days): $${upcoming.total.toFixed(2)} total.`,
        `Next items:`,
        ...lines,
      ].join('\n');
    }
    case 'category_caps': {
      const entries = Object.entries(artifacts.summary.byCategory).sort((a, b) => b[1] - a[1]);
      const top = entries.slice(0, 3).map(([cat, amt]) => ({ cat, amt }));
      const lines = top.map((x) => `- ${x.cat}: $${x.amt.toFixed(2)}`);
      return [
        `Top spend categories (selected range):`,
        ...lines,
        `Total spend: $${spend.toFixed(2)} across ${txCount} transactions.`,
        recommended.length
          ? `Recommended cap action: ${recommended[0]!.title} (saves ~$${recommended[0]!.expectedMonthlySavings.toFixed(2)}/mo).`
          : `Recommended cap action: open Plan and click Use cap on the biggest overage.`,
      ].join('\n');
    }
    case 'find_savings': {
      const top = recommended[0];
      if (!top) {
        return `I do not have any ranked actions yet. Set a goal in Plan (e.g., cap a category) and I will generate deterministic recommendations.`;
      }
      return [
        `Based on your current plan outputs, the top savings lever is:`,
        `- ${top.title} (~$${top.expectedMonthlySavings.toFixed(2)}/mo, ${(top.confidence * 100).toFixed(0)}% confidence)`,
        `If you want, ask: “What is the next best action after that?”`,
      ].join('\n');
    }
    case 'explain_plan': {
      const top = artifacts.actionPlan[0];
      if (!top)
        return `No plan actions yet. Set a goal (cap or savings-by-date) to generate actions.`;
      return [
        `Your plan is deterministic: the engine computes totals and ranks actions by (savings, effort, confidence).`,
        `Current top action: ${top.title} (~$${top.expectedMonthlySavings.toFixed(2)}/mo).`,
        `Ask: “Why is ${top.title} ranked #1?” or “Show me subscription savings.”`,
      ].join('\n');
    }
    case 'unknown':
    default: {
      return [
        `I can help with: subscriptions, upcoming bills, category caps, or finding savings.`,
        `Try asking:`,
        `- “What subscriptions should I cancel?”`,
        `- “What bills are coming up in the next 30 days?”`,
        `- “Where can I cap spending?”`,
        `- “What is my top savings action?”`,
        `Your question: “${question.trim()}”`,
      ].join('\n');
    }
  }
}

async function rewriteWithAi(text: string): Promise<{
  rewritten: string;
  usedAI: boolean;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutMs = 2500; // hackathon-safe: never hang the Coach UI
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let resp: Response;
  try {
    resp = await fetch('/api/ai/rewrite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, style: 'friendly' }),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const msg =
      e &&
      typeof e === 'object' &&
      'name' in e &&
      String((e as { name?: unknown }).name) === 'AbortError'
        ? 'timeout'
        : 'network_error';
    window.clearTimeout(timer);
    return { rewritten: text, usedAI: false, error: msg };
  } finally {
    window.clearTimeout(timer);
  }
  const json = (await resp.json()) as unknown;
  if (!resp.ok || !json || typeof json !== 'object') {
    return { rewritten: text, usedAI: false, error: `rewrite failed (${resp.status})` };
  }
  const rewritten = (json as { rewrittenText?: unknown }).rewrittenText;
  const usedAI = Boolean((json as { usedAI?: unknown }).usedAI);
  if (typeof rewritten !== 'string') {
    return { rewritten: text, usedAI: false, error: 'rewrite failed' };
  }
  return {
    rewritten,
    usedAI,
    error: (json as { error?: unknown }).error
      ? String((json as { error?: unknown }).error)
      : undefined,
  };
}

function evaluateSafety(questionRaw: string): SafetyResult {
  const q = questionRaw.trim().toLowerCase();
  if (!q) return { kind: 'ok' };

  const has = (s: string) => q.includes(s);

  const selfHarm =
    has('suicide') ||
    has('kill myself') ||
    has('self harm') ||
    has('self-harm') ||
    has('hurt myself') ||
    has('end my life');
  if (selfHarm) {
    return {
      kind: 'blocked',
      reason: 'self_harm',
      answer:
        `I can’t help with that. If you’re in immediate danger, call 911.\n` +
        `If you’re in the U.S., you can call or text 988 (Suicide & Crisis Lifeline) right now.\n` +
        `If you want, ask me something about your budget plan (subscriptions, caps, upcoming bills) and I’ll help.`,
    };
  }

  const secrets =
    has('password') ||
    has('passcode') ||
    has('2fa') ||
    has('otp') ||
    has('ssn') ||
    has('social security') ||
    has('routing number') ||
    has('account number') ||
    has('credit card') ||
    has('cvv') ||
    has('pin') ||
    has('seed phrase') ||
    has('private key') ||
    has('access token') ||
    has('plaid secret') ||
    has('supabase service role');
  if (secrets) {
    return {
      kind: 'blocked',
      reason: 'secrets',
      answer:
        `I can’t help with secrets or account credentials.\n` +
        `For safety, never share passwords, SSNs, bank account details, or API keys here.\n` +
        `I can still help with budgeting questions using your computed totals and plan actions.`,
    };
  }

  const illegal =
    has('launder') ||
    has('money laundering') ||
    has('fraud') ||
    has('steal') ||
    has('evade tax') ||
    has('tax evasion');
  if (illegal) {
    return {
      kind: 'blocked',
      reason: 'illegal',
      answer:
        `I can’t help with wrongdoing.\n` +
        `If you want, I can help you reduce spending, identify subscriptions, and set category caps using deterministic outputs.`,
    };
  }

  const investing =
    has('stock') ||
    has('crypto') ||
    has('bitcoin') ||
    has('ethereum') ||
    has('option') ||
    has('day trade');
  if (investing) {
    return {
      kind: 'limited',
      reason: 'investing',
      answer:
        `I can’t provide investment advice or tell you what to buy/sell.\n` +
        `What I can do here: find subscription savings, upcoming obligations, and deterministic budget caps from your spending history.`,
    };
  }

  return { kind: 'ok' };
}

export function CoachPanel({
  artifacts,
  onJumpToAction,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  prefillQuestion,
}: {
  artifacts: AnalysisArtifactsV1 | null;
  onJumpToAction: (actionId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefillQuestion?: string | null;
}) {
  const { flags } = useFlags();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const [traceOpen, setTraceOpen] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [turns, setTurns] = React.useState<CoachTurn[]>([]);
  const [loading, setLoading] = React.useState(false);
  const lastTrace = React.useMemo(() => {
    const last = turns.length ? turns[turns.length - 1] : null;
    return last?.trace ?? null;
  }, [turns]);

  React.useEffect(() => {
    const q = (prefillQuestion ?? '').trim();
    if (!q) return;
    setQuestion(q);
    if (!open) setOpen(true);
  }, [prefillQuestion, open, setOpen]);

  React.useEffect(() => {
    setTurns(safeParseTurns(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-10)));
  }, [turns]);

  const ask = React.useCallback(async () => {
    if (!artifacts) return;
    const q = question.trim();
    if (!q) return;

    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const steps: ToolTraceV1['steps'] = [];

    setLoading(true);
    try {
      const safetyStart = Date.now();
      const safety = evaluateSafety(q);
      steps.push({
        id: stableId(['trace', startedAt, 'safety']),
        name: 'safetyCheck()',
        at: new Date().toISOString(),
        durationMs: Date.now() - safetyStart,
        ok: safety.kind === 'ok',
        input: { questionRedacted: { length: q.length } },
        output: { kind: safety.kind, reason: (safety as { reason?: string }).reason ?? null },
        error:
          safety.kind === 'ok' ? undefined : ((safety as { reason?: string }).reason ?? 'blocked'),
      });
      if (safety.kind !== 'ok') {
        const id = stableId(['coach', new Date().toISOString(), q.slice(0, 40)]);
        const trace: ToolTraceV1 = {
          version: 1,
          startedAt,
          totalMs: Date.now() - t0,
          steps,
        };
        const turn: CoachTurn = {
          id,
          at: new Date().toISOString(),
          question: q,
          intent: {
            kind: 'safety',
            safety: safety.kind,
            reason: (safety as { reason?: string }).reason ?? 'unknown',
          },
          answer: safety.answer,
          recommendedActionIds: [],
          recommendedActionTitles: {},
          trace,
        };
        setTurns((prev) => [...prev.slice(-9), turn]);
        setQuestion('');
        return;
      }

      const intentStart = Date.now();
      const intent = parseIntent(q);
      steps.push({
        id: stableId(['trace', startedAt, 'intent']),
        name: 'parseIntent()',
        at: new Date().toISOString(),
        durationMs: Date.now() - intentStart,
        ok: true,
        input: { questionRedacted: { length: q.length } },
        output: { intentKind: intent.kind },
      });
      // CONWAY-002 fallback trace: don't log PII; intent only.
      try {
        console.debug('coach.intent', intent);
      } catch {
        // ignore
      }

      const recStart = Date.now();
      const recommended = chooseRecommendedActions({
        actions: artifacts.actionPlan,
        recurring: artifacts.recurring,
        intent,
      });
      steps.push({
        id: stableId(['trace', startedAt, 'recommend']),
        name: 'chooseRecommendedActions()',
        at: new Date().toISOString(),
        durationMs: Date.now() - recStart,
        ok: true,
        input: { intentKind: intent.kind, actionCount: artifacts.actionPlan.length },
        output: { recommendedActionIds: recommended.map((a) => a.id) },
      });

      const ansStart = Date.now();
      const answer = buildDeterministicAnswer({
        question: q,
        intent,
        artifacts,
        recommended,
      });
      steps.push({
        id: stableId(['trace', startedAt, 'answer']),
        name: 'buildDeterministicAnswer()',
        at: new Date().toISOString(),
        durationMs: Date.now() - ansStart,
        ok: true,
        input: { intentKind: intent.kind, recommendedCount: recommended.length },
        output: { answerChars: answer.length },
      });

      const id = stableId(['coach', new Date().toISOString(), q.slice(0, 40)]);
      const turn: CoachTurn = {
        id,
        at: new Date().toISOString(),
        question: q,
        intent,
        answer,
        recommendedActionIds: recommended.map((a) => a.id),
        recommendedActionTitles: Object.fromEntries(recommended.map((a) => [a.id, a.title])),
      };

      if (flags.aiEnabled) {
        const rewriteStart = Date.now();
        try {
          const ai = await rewriteWithAi(answer);
          turn.ai = { rewritten: ai.rewritten, usedAI: ai.usedAI, error: ai.error };
          steps.push({
            id: stableId(['trace', startedAt, 'ai']),
            name: 'rewriteWithAi()',
            at: new Date().toISOString(),
            durationMs: Date.now() - rewriteStart,
            ok: true,
            input: { answerChars: answer.length },
            output: {
              rewrittenChars: ai.rewritten.length,
              usedAI: ai.usedAI,
              error: ai.error ?? null,
            },
          });
        } catch (e: unknown) {
          const msg =
            e && typeof e === 'object' && 'message' in e
              ? String((e as { message?: unknown }).message)
              : 'rewrite failed';
          turn.ai = { rewritten: answer, usedAI: false, error: msg };
          steps.push({
            id: stableId(['trace', startedAt, 'ai']),
            name: 'rewriteWithAi()',
            at: new Date().toISOString(),
            durationMs: Date.now() - rewriteStart,
            ok: false,
            input: { answerChars: answer.length },
            output: { rewrittenChars: answer.length, usedAI: false },
            error: msg,
          });
        }
      }

      turn.trace = {
        version: 1,
        startedAt,
        totalMs: Date.now() - t0,
        steps,
      };

      setTurns((prev) => [...prev.slice(-9), turn]);
      setQuestion('');
    } finally {
      setLoading(false);
    }
  }, [artifacts, flags.aiEnabled, question]);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Coach
      </Button>

      <Drawer open={open} onOpenChange={setOpen} title="Decision Support Coach">
        <div style={{ display: 'grid', gap: 12 }}>
          {flags.debugTraces ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setTraceOpen(true)} disabled={!lastTrace}>
                  Trace
                </Button>
              </div>
              <TraceDrawer open={traceOpen} onOpenChange={setTraceOpen} trace={lastTrace} />
            </>
          ) : null}
          {!artifacts ? (
            <Card>
              <CardHeader>
                <CardTitle>Waiting for analysis…</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="small">Run analysis first, then ask questions about your plan.</div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ask a question</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="small" style={{ opacity: 0.95 }}>
                  Not financial advice. Don’t share secrets. Numbers are deterministic.
                  {!flags.aiEnabled ? (
                    <span style={{ marginLeft: 8, color: 'rgba(34,197,94,0.95)' }}>
                      Offline mode
                    </span>
                  ) : null}
                </div>
                <textarea
                  className="input"
                  placeholder="e.g., What is my top savings action? What bills are coming up?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void ask();
                  }}
                  disabled={!artifacts || loading}
                  rows={4}
                  style={{
                    resize: 'vertical',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    variant="primary"
                    onClick={() => void ask()}
                    disabled={!artifacts || loading || !question.trim()}
                  >
                    {loading ? 'Thinking…' : 'Ask'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setQuestion('What subscriptions should I cancel?')}
                    disabled={!artifacts || loading}
                  >
                    Subscriptions
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setQuestion('What bills are coming up in the next 30 days?')}
                    disabled={!artifacts || loading}
                  >
                    Upcoming
                  </Button>
                </div>
                <div className="small" style={{ opacity: 0.9 }}>
                  AI is {flags.aiEnabled ? 'enabled' : 'disabled'}. Numbers always come from the
                  deterministic engine.
                </div>
              </div>
            </CardBody>
          </Card>

          {turns.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Coach history</CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'grid', gap: 12 }}>
                  {turns
                    .slice()
                    .reverse()
                    .map((t) => (
                      <div
                        key={t.id}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          padding: 12,
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ fontWeight: 650 }}>{t.question}</div>

                        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
                          {flags.aiEnabled && t.ai?.rewritten ? t.ai.rewritten : t.answer}
                        </div>
                        {flags.aiEnabled && t.ai?.rewritten ? (
                          <details>
                            <summary className="small" style={{ cursor: 'pointer' }}>
                              Show original (deterministic)
                            </summary>
                            <div
                              className="small"
                              style={{ marginTop: 8, whiteSpace: 'pre-wrap', opacity: 0.9 }}
                            >
                              {t.answer}
                            </div>
                          </details>
                        ) : null}

                        {t.recommendedActionIds.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {t.recommendedActionIds.map((id) => (
                              <button
                                key={`${t.id}_${id}`}
                                type="button"
                                className="btn btnGhost"
                                onClick={() => {
                                  onJumpToAction(id);
                                  setOpen(false);
                                }}
                              >
                                Jump: {t.recommendedActionTitles[id] ?? 'action'}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <details>
                          <summary className="small" style={{ cursor: 'pointer' }}>
                            Debug (intent)
                          </summary>
                          <pre
                            className="small"
                            style={{
                              marginTop: 8,
                              whiteSpace: 'pre-wrap',
                              opacity: 0.85,
                            }}
                          >
                            {JSON.stringify(t.intent, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </Drawer>
    </>
  );
}
