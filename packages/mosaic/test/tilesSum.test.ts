import { describe, expect, it } from 'vitest';
import { buildTreemapTiles } from '../src/treemap';

describe('buildTreemapTiles', () => {
  it('preserves total value', () => {
    const byCategory = { Dining: 100, Groceries: 50, Housing: 200 };
    const tiles = buildTreemapTiles(byCategory);
    const total = tiles.reduce((a, t) => a + t.value, 0);
    expect(total).toBe(350);
  });
});
