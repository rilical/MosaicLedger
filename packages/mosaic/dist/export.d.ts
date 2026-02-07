import type { TreemapTile } from './treemap.js';
export type ExportPlanItem = {
    title: string;
    savings: number;
};
export type ExportPosterInput = {
    title: string;
    rangeLabel: string;
    totalSpend: number;
    tiles: TreemapTile[];
    planItems: ExportPlanItem[];
    currency?: string;
};
export declare function exportToSvg(input: ExportPosterInput): string;
//# sourceMappingURL=export.d.ts.map