import { describe, expect, it } from 'vitest';
import { exportToSvg } from '../src/export';
import type { TreemapTile } from '../src/treemap';

describe('exportToSvg', () => {
  it('returns a valid svg string', () => {
    const tiles: TreemapTile[] = [
      { id: 'Food', label: 'Food', value: 120, color: '#f97316', x: 0, y: 0, w: 600, h: 400 },
      { id: 'Rent', label: 'Rent', value: 900, color: '#22c55e', x: 600, y: 0, w: 400, h: 650 },
    ];

    const svg = exportToSvg({
      title: 'MosaicLedger',
      rangeLabel: 'This month',
      totalSpend: 1020,
      tiles,
      planItems: [
        { title: 'Cancel a subscription', savings: 12.34 },
        { title: 'Cap Food to $90/mo', savings: 30 },
      ],
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('MosaicLedger');
    expect(svg).toContain('Total spend');
    expect(svg).toContain('TOP ACTIONS');
    expect(svg).toContain('LEGEND');
  });
});
