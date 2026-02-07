import { hierarchy, treemap } from 'd3-hierarchy';
import { colorForLabel } from './colors.js';
function isLeaf(d) {
    return 'value' in d;
}
export function buildTreemapTiles(byCategory) {
    const children = Object.entries(byCategory)
        .map(([label, value]) => ({ label, value }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value);
    const root = hierarchy({ children })
        .sum((d) => (isLeaf(d) ? d.value : 0))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    // d3's types model the treemap output as HierarchyRectangularNode, but the transform isn't captured.
    const layout = treemap().size([1000, 650]).padding(10).round(true);
    const rootRect = layout(root);
    const tiles = [];
    for (const node of rootRect.leaves()) {
        const d = node.data;
        tiles.push({
            id: d.label,
            label: d.label,
            value: d.value,
            color: colorForLabel(d.label),
            x: node.x0,
            y: node.y0,
            w: Math.max(0, node.x1 - node.x0),
            h: Math.max(0, node.y1 - node.y0),
        });
    }
    return tiles;
}
export function buildTreemap(inputs, _level = 'consumer') {
    const children = inputs
        .filter((t) => Number.isFinite(t.value) && t.value > 0)
        .map((t) => ({ id: t.id, label: t.label, value: t.value, color: t.color }))
        .sort((a, b) => {
        const v = b.value - a.value;
        if (v)
            return v;
        return a.label.localeCompare(b.label);
    });
    const root = hierarchy({ children })
        .sum((d) => (isLeaf(d) ? d.value : 0))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const layout = treemap().size([1000, 650]).padding(10).round(true);
    const rootRect = layout(root);
    const tiles = [];
    for (const node of rootRect.leaves()) {
        const d = node.data;
        tiles.push({
            id: d.id ?? d.label,
            label: d.label,
            value: d.value,
            color: d.color ?? colorForLabel(d.label),
            x: node.x0,
            y: node.y0,
            w: Math.max(0, node.x1 - node.x0),
            h: Math.max(0, node.y1 - node.y0),
        });
    }
    return tiles;
}
//# sourceMappingURL=treemap.js.map