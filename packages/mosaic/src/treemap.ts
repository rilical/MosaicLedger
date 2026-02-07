import { hierarchy, treemap } from 'd3-hierarchy';
import { colorForLabel } from './colors.js';

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

type LeafDatum = { label: string; value: number; id?: string; color?: string };
type RootDatum = { children: LeafDatum[] };
type Datum = RootDatum | LeafDatum;

function isLeaf(d: Datum): d is LeafDatum {
  return 'value' in d;
}

export function buildTreemapTiles(byCategory: Record<string, number>): TreemapTile[] {
  const children: LeafDatum[] = Object.entries(byCategory)
    .map(([label, value]) => ({
      label: label != null && typeof label === 'string' ? label : '',
      value,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const root = hierarchy<Datum>({ children })
    .sum((d) => (isLeaf(d) ? d.value : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // d3's types model the treemap output as HierarchyRectangularNode, but the transform isn't captured.
  const layout = treemap<Datum>().size([1000, 650]).padding(10).round(true);
  const rootRect = layout(root);

  const tiles: TreemapTile[] = [];
  for (const node of rootRect.leaves()) {
    const d = node.data as LeafDatum;
    const label = d.label != null && typeof d.label === 'string' ? d.label : '';
    tiles.push({
      id: label || 'unknown',
      label,
      value: d.value,
      color: colorForLabel(label),
      x: node.x0,
      y: node.y0,
      w: Math.max(0, node.x1 - node.x0),
      h: Math.max(0, node.y1 - node.y0),
    });
  }

  return tiles;
}

export function buildTreemap(
  inputs: TreemapTileInput[],
  _level: 'consumer' | 'ops' = 'consumer',
): TreemapTile[] {
  const children: LeafDatum[] = inputs
    .filter((t) => Number.isFinite(t.value) && t.value > 0)
    .map((t) => ({
      id: t.id ?? '',
      label: t.label != null && typeof t.label === 'string' ? t.label : '',
      value: t.value,
      color: t.color,
    }))
    .sort((a, b) => {
      const v = b.value - a.value;
      if (v) return v;
      return a.label.localeCompare(b.label);
    });

  const root = hierarchy<Datum>({ children })
    .sum((d) => (isLeaf(d) ? d.value : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<Datum>().size([1000, 650]).padding(10).round(true);
  const rootRect = layout(root);

  const tiles: TreemapTile[] = [];
  for (const node of rootRect.leaves()) {
    const d = node.data as LeafDatum;
    const label = d.label != null && typeof d.label === 'string' ? d.label : '';
    tiles.push({
      id: (d.id ?? label) || 'unknown',
      label,
      value: d.value,
      color: d.color ?? colorForLabel(label),
      x: node.x0,
      y: node.y0,
      w: Math.max(0, node.x1 - node.x0),
      h: Math.max(0, node.y1 - node.y0),
    });
  }

  return tiles;
}
