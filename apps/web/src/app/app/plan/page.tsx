'use client';

import * as React from 'react';
import { ActionsPanel } from '../../../components/ActionsPanel';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';
import { usePlanGoal } from '../../../components/Plan/usePlanGoal';
import { useSubscriptionChoices } from '../../../lib/subscriptions/choices';

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

export default function PlanPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const { goal, setGoal, resetGoal } = usePlanGoal();
  const { choices } = useSubscriptionChoices();

  const req = React.useMemo(() => ({ ...toAnalyzeRequest(settings), goal }), [settings, goal]);
  const { artifacts, loading, error, recompute } = useAnalysis(req);

  const actions = React.useMemo(() => {
    const base = artifacts?.actionPlan ?? [];
    // VISA-001: subscription manager choices influence the plan.
    // If a user marks a subscription "keep", we hide the cancel action to keep guidance aligned.
    return base.filter((a) => {
      if (a.actionType !== 'cancel') return true;
      if (a.target.kind !== 'merchant') return true;
      return choices[a.target.value] !== 'keep';
    });
  }, [artifacts?.actionPlan, choices]);
  const beforeSpend = artifacts?.summary.totalSpend ?? 0;

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const a of actions) next[a.id] = prev[a.id] ?? true;
      return next;
    });
  }, [actions]);

  const selectedSavings = React.useMemo(() => {
    let sum = 0;
    for (const a of actions) {
      if (selected[a.id]) sum += a.expectedMonthlySavings;
    }
    return sum;
  }, [actions, selected]);

  const afterSpend = Math.max(0, beforeSpend - selectedSavings);

  const selectTopN = React.useCallback(
    (n: number) => {
      setSelected(() => {
        const next: Record<string, boolean> = {};
        actions.forEach((a, idx) => {
          next[a.id] = idx < n;
        });
        return next;
      });
    },
    [actions],
  );

  const byCategory = artifacts?.summary.byCategory ?? {};
  const budgetRows = React.useMemo(() => {
    return Object.entries(byCategory)
      .map(([category, spend]) => {
        // Hackathon-safe deterministic heuristic:
        // - For small categories, don't recommend a cap (delta = 0).
        // - Otherwise, suggest a 25% reduction.
        const suggestedCap = Math.max(0, spend < 75 ? spend : spend * 0.75);
        const delta = Math.max(0, spend - suggestedCap);
        return { category, spend, suggestedCap, delta };
      })
      .sort((a, b) => b.spend - a.spend);
  }, [byCategory]);

  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Plan</h1>
        <div className="pageMeta">
          <div className="pageTagline">Ranked next actions with quantified monthly savings</div>
          <Badge tone={error ? 'warn' : loading ? 'warn' : 'good'}>
            {error ? 'Error' : loading ? 'Busy' : 'Ready'}
          </Badge>
        </div>
      </div>

      <AnalysisControls
        settings={settings}
        setSettings={setSettings}
        loading={loading}
        onRecompute={() => void recompute()}
      />

      {error ? (
        <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Scenario (Before / After)</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(beforeSpend)}
                </div>
                <div className="small">Before spend (selected range)</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(afterSpend)}
                </div>
                <div className="small">After applying selected actions</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(selectedSavings)}
                </div>
                <div className="small">Estimated monthly savings</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <div className="small">
                Selected: {actions.filter((a) => selected[a.id]).length}/{actions.length}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btnGhost" onClick={() => selectTopN(1)} type="button">
                Top 1
              </button>
              <button className="btn btnGhost" onClick={() => selectTopN(3)} type="button">
                Top 3
              </button>
              <button
                className="btn btnGhost"
                onClick={() => selectTopN(actions.length)}
                type="button"
              >
                All
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div className="small">
                Goal:{' '}
                {goal.goalType === 'monthly_cap'
                  ? `Cap ${goal.category} at $${goal.capAmount.toFixed(0)}/mo`
                  : `Save ${formatMoney(goal.saveAmount)} by ${goal.byDate}`}
              </div>
              <button className="btn btnGhost" type="button" onClick={resetGoal}>
                Reset goal
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.55fr 0.55fr 0.55fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div className="small">Category</div>
              <div className="small" style={{ textAlign: 'right' }}>
                Spend
              </div>
              <div className="small" style={{ textAlign: 'right' }}>
                Suggested cap
              </div>
              <div className="small" style={{ textAlign: 'right' }}>
                Delta
              </div>
              <div className="small" style={{ textAlign: 'right' }}>
                Goal
              </div>

              {budgetRows.slice(0, 12).map((r) => {
                const overCap = r.spend > r.suggestedCap;
                return (
                  <React.Fragment key={r.category}>
                    <div style={{ fontWeight: 650 }}>{r.category}</div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(r.spend)}
                    </div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${r.suggestedCap.toFixed(0)}
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: overCap ? 'rgba(234,179,8,0.95)' : 'var(--muted)',
                      }}
                    >
                      {formatMoney(r.delta)}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        className={overCap ? 'btn btnPrimary' : 'btn'}
                        type="button"
                        disabled={!overCap}
                        style={{
                          opacity: overCap ? 1 : 0.5,
                          cursor: overCap ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() =>
                          setGoal({
                            goalType: 'monthly_cap',
                            category: r.category,
                            capAmount: Math.round(r.suggestedCap),
                          })
                        }
                      >
                        Use cap
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="small">
              Suggested caps are deterministic (currently: 25% reduction vs spend in the selected
              range).
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Actions</CardTitle>
        </CardHeader>
        <CardBody>
          <ActionsPanel actions={actions} selected={selected} onSelectChange={setSelected} />
        </CardBody>
      </Card>
    </div>
  );
}
