import type { ActionRecommendation, GoalInput, Summary } from './types';
import { stableId } from './normalize';

export function recommendActions(summary: Summary, goal: GoalInput): ActionRecommendation[] {
  void goal; // Placeholder: goal-aware ranking comes next. Keep engine deterministic.
  const actions: ActionRecommendation[] = [];

  // Template 1: cancel recurring subscriptions (best low-effort wins)
  for (const r of summary.recurring) {
    actions.push({
      id: stableId(['act', 'cancel', r.merchant]),
      actionType: 'cancel',
      title: `Cancel ${r.merchant}`,
      target: { kind: 'merchant', value: r.merchant },
      expectedMonthlySavings: r.expectedAmount,
      effortScore: 0.15,
      confidence: r.confidence,
      explanation: `Detected a ${r.cadence} recurring charge. Canceling saves about $${r.expectedAmount.toFixed(2)}/mo.`,
    });
  }

  // Template 2: cap top discretionary categories
  const categories = Object.entries(summary.byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  for (const c of categories.slice(0, 3)) {
    const cap = Math.max(0, c.amount * 0.75);
    const savings = Math.max(0, c.amount - cap);
    if (savings <= 0) continue;

    actions.push({
      id: stableId(['act', 'cap', c.category]),
      actionType: 'cap',
      title: `Cap ${c.category} to $${cap.toFixed(0)}/mo`,
      target: { kind: 'category', value: c.category },
      expectedMonthlySavings: savings,
      effortScore: 0.55,
      confidence: 0.7,
      explanation: `Last month was $${c.amount.toFixed(2)}. A 25% reduction frees ~$${savings.toFixed(2)}/mo.`,
    });
  }

  // Template 3: substitute delivery apps (simple heuristic)
  const deliverySpend = summary.byMerchant['DOORDASH'] ?? 0;
  if (deliverySpend > 0) {
    const savings = deliverySpend * 0.35;
    actions.push({
      id: stableId(['act', 'sub', 'delivery']),
      actionType: 'substitute',
      title: 'Swap 2 delivery orders for groceries',
      target: { kind: 'merchant', value: 'DOORDASH' },
      expectedMonthlySavings: savings,
      effortScore: 0.65,
      confidence: 0.6,
      explanation: `Delivery spend was $${deliverySpend.toFixed(2)}. Swapping a couple orders can save roughly $${savings.toFixed(2)}/mo.`,
    });
  }

  // Rank
  const ranked = actions
    .map((a) => {
      const value = a.expectedMonthlySavings;
      const effort = 1 - a.effortScore;
      const conf = a.confidence;
      const score = 0.6 * value + 0.2 * effort * 100 + 0.2 * conf * 100;
      return { a, score };
    })
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);

  // For MVP, always return top 5.
  return ranked.slice(0, 5);
}
