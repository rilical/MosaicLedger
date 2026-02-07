// JSON fixture is committed and PII-free. Keep it small and deterministic for CI/demo safety.
import demoDataset from './demoDataset.json' assert { type: 'json' };
export const DEMO_DATASET = demoDataset;
export function getDemoTransactions() {
    // Return a copy to keep consumers from mutating the shared module object.
    return DEMO_DATASET.map((t) => ({ ...t }));
}
export * from './plaidSyncFixture.js';
//# sourceMappingURL=index.js.map