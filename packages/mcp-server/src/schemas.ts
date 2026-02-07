import { z } from 'zod';

export const SCHEMA_VERSION = 'v1' as const;

export const NormalizedTransactionSchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  amount: z.number(),
  merchantRaw: z.string(),
  merchant: z.string(),
  category: z.string(),
  source: z.enum(['csv', 'bank', 'demo']),
});

export const RecurringChargeSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  cadence: z.enum(['weekly', 'biweekly', 'monthly']),
  nextDate: z.string(),
  expectedAmount: z.number(),
  confidence: z.number(),
});

export const SummarySchema = z.object({
  transactions: z.array(NormalizedTransactionSchema),
  byCategory: z.record(z.string(), z.number()),
  byMerchant: z.record(z.string(), z.number()),
  recurring: z.array(RecurringChargeSchema),
  totalSpend: z.number(),
});

export const GoalInputSchema = z.union([
  z.object({
    goalType: z.literal('save_by_date'),
    saveAmount: z.number(),
    byDate: z.string(),
  }),
  z.object({
    goalType: z.literal('monthly_cap'),
    category: z.string(),
    capAmount: z.number(),
  }),
]);

export const ActionRecommendationSchema = z.object({
  id: z.string(),
  actionType: z.enum(['cancel', 'cap', 'substitute']),
  title: z.string(),
  target: z.object({
    kind: z.enum(['merchant', 'category']),
    value: z.string(),
  }),
  expectedMonthlySavings: z.number(),
  effortScore: z.number(),
  confidence: z.number(),
  explanation: z.string(),
  reasons: z.array(z.string()).optional(),
});

export const TreemapTileSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const AnalyzeTransactionsInputSchema = z.object({
  version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  transactions: z.array(NormalizedTransactionSchema),
});

export const AnalyzeTransactionsOutputSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  summary: SummarySchema,
});

export const BuildMosaicSpecInputSchema = z.object({
  version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  byCategory: z.record(z.string(), z.number()),
});

export const BuildMosaicSpecOutputSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  tiles: z.array(TreemapTileSchema),
});

export const BuildActionPlanInputSchema = z.object({
  version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  summary: SummarySchema,
  goal: GoalInputSchema,
});

export const BuildActionPlanOutputSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  actions: z.array(ActionRecommendationSchema),
});
