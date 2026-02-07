'use client';

import * as React from 'react';
import type { GoalInput } from '@mosaicledger/core';

const STORAGE_KEY = 'mosaicledger.planGoal.v1';

const DEFAULT_GOAL: GoalInput = {
  goalType: 'save_by_date',
  saveAmount: 200,
  byDate: '2026-04-01',
};

function safeParse(raw: string | null): GoalInput {
  if (!raw) return DEFAULT_GOAL;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return DEFAULT_GOAL;
    const obj = v as Record<string, unknown>;

    if (obj.goalType === 'monthly_cap') {
      const category = typeof obj.category === 'string' ? obj.category : '';
      const capAmount = Number(obj.capAmount);
      if (!category || !Number.isFinite(capAmount)) return DEFAULT_GOAL;
      return { goalType: 'monthly_cap', category, capAmount };
    }

    if (obj.goalType === 'save_by_date') {
      const saveAmount = Number(obj.saveAmount);
      const byDate = typeof obj.byDate === 'string' ? obj.byDate : '';
      if (!Number.isFinite(saveAmount) || !byDate) return DEFAULT_GOAL;
      return { goalType: 'save_by_date', saveAmount, byDate };
    }

    return DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export function usePlanGoal(): {
  goal: GoalInput;
  setGoal: React.Dispatch<React.SetStateAction<GoalInput>>;
  resetGoal: () => void;
} {
  const [goal, setGoal] = React.useState<GoalInput>(DEFAULT_GOAL);

  React.useEffect(() => {
    setGoal(safeParse(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  }, [goal]);

  const resetGoal = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setGoal(DEFAULT_GOAL);
  }, []);

  return { goal, setGoal, resetGoal };
}
