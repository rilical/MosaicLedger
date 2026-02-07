'use client';

import * as React from 'react';
import type { ActionRecommendation, RecurringCharge } from '@mosaicledger/core';
import type { AnalysisArtifactsV1 } from '../../lib/analysis/types';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../ui';
import { Drawer } from '../ui/Drawer';
import { useFlags } from '../../lib/flags-client';
import { parseIntent } from './intent';

type CoachTurn = {
  id: string;
  at: string; // ISO
  question: string;
  intent: unknown;
  answer: string;
  recommendedActionIds: string[];
  recommendedActionTitles: Record<string, string>;
  ai?: { rewritten?: string; usedAI?: boolean; error?: string };
};

const STORAGE_KEY = 'mosaicledger.coachHistory.v1';

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
  const resp = await fetch('/api/ai/rewrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, style: 'friendly' }),
  });
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

export function CoachPanel({
  artifacts,
  onJumpToAction,
}: {
  artifacts: AnalysisArtifactsV1 | null;
  onJumpToAction: (actionId: string) => void;
}) {
  const { flags } = useFlags();
  const [open, setOpen] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [turns, setTurns] = React.useState<CoachTurn[]>([]);
  const [loading, setLoading] = React.useState(false);

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

    setLoading(true);
    try {
      const intent = parseIntent(q);
      // CONWAY-002 fallback trace: don't log PII; intent only.
      try {
        console.debug('coach.intent', intent);
      } catch {
        // ignore
      }

      const recommended = chooseRecommendedActions({
        actions: artifacts.actionPlan,
        recurring: artifacts.recurring,
        intent,
      });

      const answer = buildDeterministicAnswer({
        question: q,
        intent,
        artifacts,
        recommended,
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
        const ai = await rewriteWithAi(answer);
        turn.ai = { rewritten: ai.rewritten, usedAI: ai.usedAI, error: ai.error };
      }

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
                <input
                  className="input"
                  placeholder="e.g., What is my top savings action? What bills are coming up?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void ask();
                  }}
                  disabled={!artifacts || loading}
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
