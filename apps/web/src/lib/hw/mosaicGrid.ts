import type { TreemapTile } from '@mosaicledger/mosaic';

export type MosaicGrid = {
  w: number;
  h: number;
  // Row-major 2D grid (grid[row][col]) of "#RRGGBB"
  grid: string[][];
};

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(v)));
}

function inTile(t: TreemapTile, x: number, y: number): boolean {
  return x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h;
}

export function quantizeTilesToGrid(params: {
  tiles: TreemapTile[];
  w?: number;
  h?: number;
  canvasW?: number;
  canvasH?: number;
  background?: string;
}): MosaicGrid {
  const w = clampInt(params.w ?? 10, 4, 32);
  const h = clampInt(params.h ?? 10, 4, 32);
  const canvasW = params.canvasW ?? 1000;
  const canvasH = params.canvasH ?? 650;
  const background = params.background ?? '#000000';

  // Deterministic: stable tile ordering so overlap edges behave consistently.
  // (d3 tiles should not overlap, but padding/rounding can produce boundary equality.)
  const tiles = [...params.tiles].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const grid: string[][] = [];

  for (let row = 0; row < h; row++) {
    const outRow: string[] = [];
    const cy = (row + 0.5) * (canvasH / h);
    for (let col = 0; col < w; col++) {
      const cx = (col + 0.5) * (canvasW / w);
      const tile = tiles.find((t) => inTile(t, cx, cy));
      outRow.push(tile?.color ?? background);
    }
    grid.push(outRow);
  }

  return { w, h, grid };
}
