import { describe, expect, test } from 'vitest';
import { computeDemoArtifacts } from '../src/lib/analysis/compute';
import { quantizeTilesToGrid } from '../src/lib/hw/mosaicGrid';

describe('hw mosaic grid quantization', () => {
  test('returns stable 10x10 grid with hex colors', () => {
    const artifacts = computeDemoArtifacts();
    const out = quantizeTilesToGrid({ tiles: artifacts.mosaic.tiles, w: 10, h: 10 });

    expect(out.w).toBe(10);
    expect(out.h).toBe(10);
    expect(out.grid).toHaveLength(10);
    for (const row of out.grid) {
      expect(row).toHaveLength(10);
      for (const c of row) {
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});
