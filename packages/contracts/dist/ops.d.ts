import type { DateRange } from './transactions';
export type OpsAnalyst = 'risk' | 'compliance' | 'recon';
export type OpsSeverity = 'low' | 'med' | 'high';
export type OpsFinding = {
    id: string;
    analyst: OpsAnalyst;
    kind: 'vendor_concentration' | 'category_spike' | 'duplicate_suspect' | 'high_frequency_merchant' | 'round_amounts_cluster';
    severity: OpsSeverity;
    metrics: Record<string, number>;
    why: string[];
    entities: {
        merchant?: string;
        category?: string;
        accountId?: string;
    };
};
export type OpsBrief = {
    analyst: OpsAnalyst;
    severity: OpsSeverity;
    bullets: string[];
    nextSteps: string[];
    findings: OpsFinding[];
};
export type OpsTileInput = {
    id: string;
    label: string;
    value: number;
    color: string;
    meta?: Record<string, unknown>;
};
export type OpsAnalysis = {
    range: DateRange;
    generatedAt: string;
    findings: OpsFinding[];
    briefs: OpsBrief[];
    tiles: OpsTileInput[];
};
//# sourceMappingURL=ops.d.ts.map