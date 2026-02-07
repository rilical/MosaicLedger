export type TreemapTile = {
    id: string;
    label: string;
    value: number;
    color: string;
    x: number;
    y: number;
    w: number;
    h: number;
};
export type TreemapTileInput = {
    id: string;
    label: string;
    value: number;
    color?: string;
};
export declare function buildTreemapTiles(byCategory: Record<string, number>): TreemapTile[];
export declare function buildTreemap(inputs: TreemapTileInput[], _level?: 'consumer' | 'ops'): TreemapTile[];
//# sourceMappingURL=treemap.d.ts.map