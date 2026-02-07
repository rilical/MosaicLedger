import type { ActionRecommendation, Summary } from './types';

export type ScenarioResult = {
  beforeSpend: number;
  afterSpend: number;
  estimatedMonthlySavings: number;
  selectedActionCount: number;
};

export function simulateScenario(params: {
  summary: Pick<Summary, 'totalSpend'>;
  selectedActions: ActionRecommendation[];
}): ScenarioResult {
  const beforeSpend = Number(params.summary.totalSpend);
  // Guard against NaN poisoning: one bad action value shouldn't zero the scenario.
  const savings = params.selectedActions.reduce((sum, a) => {
    const v = Number(a.expectedMonthlySavings);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  const estimatedMonthlySavings = Number.isFinite(savings) ? savings : 0;
  const afterSpend = Math.max(
    0,
    (Number.isFinite(beforeSpend) ? beforeSpend : 0) - estimatedMonthlySavings,
  );

  return {
    beforeSpend: Number.isFinite(beforeSpend) ? beforeSpend : 0,
    afterSpend,
    estimatedMonthlySavings,
    selectedActionCount: params.selectedActions.length,
  };
}
