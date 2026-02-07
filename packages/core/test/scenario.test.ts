import { describe, expect, test } from 'vitest';
import { simulateScenario } from '../src/scenario';
import type { ActionRecommendation } from '../src/types';

function act(partial: Partial<ActionRecommendation>): ActionRecommendation {
  return {
    id: partial.id ?? 'a',
    actionType: partial.actionType ?? 'cap',
    title: partial.title ?? 'Cap',
    target: partial.target ?? { kind: 'category', value: 'X' },
    expectedMonthlySavings: partial.expectedMonthlySavings ?? 10,
    effortScore: partial.effortScore ?? 0.5,
    confidence: partial.confidence ?? 0.7,
    explanation: partial.explanation ?? 'x',
    reasons: partial.reasons ?? ['x'],
  };
}

describe('CONWAY-003: simulateScenario', () => {
  test('computes before/after deterministically', () => {
    const r = simulateScenario({
      summary: { totalSpend: 1000 },
      selectedActions: [act({ expectedMonthlySavings: 100 }), act({ expectedMonthlySavings: 50 })],
    });
    expect(r.beforeSpend).toBe(1000);
    expect(r.estimatedMonthlySavings).toBe(150);
    expect(r.afterSpend).toBe(850);
    expect(r.selectedActionCount).toBe(2);
  });

  test('never produces negative afterSpend', () => {
    const r = simulateScenario({
      summary: { totalSpend: 100 },
      selectedActions: [act({ expectedMonthlySavings: 999 })],
    });
    expect(r.afterSpend).toBe(0);
  });
});
