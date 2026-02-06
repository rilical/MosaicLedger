export type DemoRawTransaction = {
  date: string;
  name: string;
  amount: number;
  category?: string;
};

// JSON fixture is committed and PII-free. Keep it small and deterministic for CI/demo safety.
import demoDataset from './demoDataset.json' assert { type: 'json' };

export const DEMO_DATASET: ReadonlyArray<DemoRawTransaction> = demoDataset as DemoRawTransaction[];

export function getDemoTransactions(): DemoRawTransaction[] {
  // Return a copy to keep consumers from mutating the shared module object.
  return DEMO_DATASET.map((t) => ({ ...t }));
}
