export type CoachIntent =
  | { kind: 'find_savings'; horizon: 'monthly' }
  | { kind: 'explain_plan' }
  | { kind: 'subscriptions' }
  | { kind: 'upcoming_bills' }
  | { kind: 'category_caps' }
  | { kind: 'unknown' };

export function parseIntent(questionRaw: string): CoachIntent {
  const q = questionRaw.trim().toLowerCase();
  if (!q) return { kind: 'unknown' };

  const has = (s: string) => q.includes(s);

  if (has('subscription') || has('recurring') || has('cancel') || has('downgrade')) {
    return { kind: 'subscriptions' };
  }
  if (has('upcoming') || has('next 30') || has('next 30 days') || has('bill')) {
    return { kind: 'upcoming_bills' };
  }
  if (has('cap') || has('budget') || has('category')) {
    return { kind: 'category_caps' };
  }
  if (has('save') || has('savings') || has('reduce')) {
    return { kind: 'find_savings', horizon: 'monthly' };
  }
  if (has('why') || has('explain') || has('plan')) {
    return { kind: 'explain_plan' };
  }

  return { kind: 'unknown' };
}
