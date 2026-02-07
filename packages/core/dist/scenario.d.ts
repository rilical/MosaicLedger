import type { ActionRecommendation, Summary } from './types.js';
export type ScenarioResult = {
    beforeSpend: number;
    afterSpend: number;
    estimatedMonthlySavings: number;
    selectedActionCount: number;
};
export declare function simulateScenario(params: {
    summary: Pick<Summary, 'totalSpend'>;
    selectedActions: ActionRecommendation[];
}): ScenarioResult;
//# sourceMappingURL=scenario.d.ts.map