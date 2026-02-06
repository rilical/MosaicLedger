import { colorForLabel } from '../theme/colors';

export type Tile = {
  id: string;
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
};

export type Recurring = {
  id: string;
  merchant: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  nextDate: string;
  expectedAmount: number;
  confidence: number;
};

export type Action = {
  id: string;
  title: string;
  expectedMonthlySavings: number;
  effort: 'Low' | 'Medium' | 'High';
  confidence: number;
  explanation: string;
};

export const sample = {
  monthLabel: 'Jan 2026',
  totalSpend: 1667.12,
  tilesByCategory: (() => {
    const mk = (
      label: string,
      value: number,
      x: number,
      y: number,
      w: number,
      h: number,
      count: number,
    ): Tile => ({
      id: label,
      label,
      value,
      color: colorForLabel(label),
      x,
      y,
      w,
      h,
      count,
    });

    // Hand-crafted treemap-like layout for UI-only prototype.
    return [
      mk('Housing', 1200, 12, 12, 616, 300, 1),
      mk('Groceries', 176.83, 640, 12, 348, 160, 2),
      mk('Dining', 80.74, 640, 184, 168, 128, 5),
      mk('Utilities', 79.99, 820, 184, 168, 128, 1),
      mk('Shopping', 47.12, 640, 324, 168, 150, 1),
      mk('Transport', 40.47, 820, 324, 168, 150, 2),
      mk('Entertainment', 52.96, 12, 324, 616, 150, 4),
    ];
  })(),
  recurring: [
    {
      id: 'r_netflix',
      merchant: 'NETFLIX',
      cadence: 'monthly',
      nextDate: '2026-02-19',
      expectedAmount: 15.49,
      confidence: 0.92,
    },
    {
      id: 'r_spotify',
      merchant: 'SPOTIFY',
      cadence: 'monthly',
      nextDate: '2026-02-20',
      expectedAmount: 10.99,
      confidence: 0.88,
    },
    {
      id: 'r_rent',
      merchant: 'RENT',
      cadence: 'monthly',
      nextDate: '2026-02-24',
      expectedAmount: 1200,
      confidence: 0.8,
    },
  ] satisfies Recurring[],
  actions: [
    {
      id: 'a_cancel_netflix',
      title: 'Cancel NETFLIX',
      expectedMonthlySavings: 15.49,
      effort: 'Low',
      confidence: 0.92,
      explanation: 'Detected a monthly recurring charge. Canceling saves about $15.49/mo.',
    },
    {
      id: 'a_cap_dining',
      title: 'Cap Dining to $60/mo',
      expectedMonthlySavings: 20.74,
      effort: 'Medium',
      confidence: 0.7,
      explanation:
        'Last month was $80.74. A small cap frees ~$20.74/mo without changing everything.',
    },
    {
      id: 'a_swap_delivery',
      title: 'Swap 2 delivery orders for groceries',
      expectedMonthlySavings: 21.0,
      effort: 'Medium',
      confidence: 0.6,
      explanation:
        'Delivery is a high-friction expense. Swapping a couple orders can save around $20/mo.',
    },
    {
      id: 'a_shop_pause',
      title: 'Pause one impulse-shopping week',
      expectedMonthlySavings: 15.0,
      effort: 'High',
      confidence: 0.55,
      explanation: 'A short pause can reset spend patterns. Small, repeatable wins compound.',
    },
    {
      id: 'a_reduce_transport',
      title: 'Batch trips to reduce rideshares',
      expectedMonthlySavings: 8.0,
      effort: 'Medium',
      confidence: 0.58,
      explanation: 'Combining errands reduces rideshare frequency while keeping convenience.',
    },
  ] satisfies Action[],
};
