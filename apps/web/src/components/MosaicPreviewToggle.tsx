'use client';

import * as React from 'react';
import type { CSSProperties } from 'react';

type Tile = { color: string; colSpan: number; rowSpan: number; label?: string };

const presets = {
  deterministic: {
    label: 'Deterministic',
    tiles: [
      { color: '#8b5cf6', colSpan: 4, rowSpan: 4, label: 'Salary' },
      { color: '#eab308', colSpan: 2, rowSpan: 3, label: 'Investments' },
      { color: '#14b8a6', colSpan: 2, rowSpan: 3, label: 'Rent' },
      { color: '#3b82f6', colSpan: 2, rowSpan: 2, label: 'Groceries' },
      { color: '#22c55e', colSpan: 3, rowSpan: 2, label: 'Utilities' },
      { color: '#f97316', colSpan: 2, rowSpan: 2, label: 'Transport' },
      { color: '#f43f5e', colSpan: 3, rowSpan: 2, label: 'Entertainment' },
      { color: '#6366f1', colSpan: 2, rowSpan: 2, label: 'Healthcare' },
      { color: '#10b981', colSpan: 4, rowSpan: 2, label: 'Savings' },
      { color: '#84cc16', colSpan: 2, rowSpan: 2, label: 'Dining' },
      { color: '#f59e0b', colSpan: 2, rowSpan: 2, label: 'Shopping' },
      { color: '#0ea5e9', colSpan: 2, rowSpan: 2, label: 'Education' },
    ],
  },
  categorical: {
    label: 'Categorical',
    tiles: [
      { color: '#38bdf8', colSpan: 3, rowSpan: 3, label: 'Income' },
      { color: '#38bdf8', colSpan: 2, rowSpan: 2, label: 'Bonus' },
      { color: '#f59e0b', colSpan: 3, rowSpan: 4, label: 'Housing' },
      { color: '#f59e0b', colSpan: 2, rowSpan: 2, label: 'Utilities' },
      { color: '#22c55e', colSpan: 3, rowSpan: 2, label: 'Food' },
      { color: '#22c55e', colSpan: 2, rowSpan: 3, label: 'Dining' },
      { color: '#f43f5e', colSpan: 3, rowSpan: 2, label: 'Transport' },
      { color: '#8b5cf6', colSpan: 2, rowSpan: 2, label: 'Personal' },
      { color: '#8b5cf6', colSpan: 4, rowSpan: 2, label: 'Wellness' },
      { color: '#f43f5e', colSpan: 2, rowSpan: 2, label: 'Travel' },
    ],
  },
  timeline: {
    label: 'Timeline',
    tiles: [
      { color: '#6366f1', colSpan: 8, rowSpan: 2, label: 'January' },
      { color: '#3b82f6', colSpan: 4, rowSpan: 3, label: 'February' },
      { color: '#0ea5e9', colSpan: 4, rowSpan: 3, label: 'March' },
      { color: '#14b8a6', colSpan: 3, rowSpan: 2, label: 'April' },
      { color: '#22c55e', colSpan: 2, rowSpan: 2, label: 'May' },
      { color: '#84cc16', colSpan: 3, rowSpan: 2, label: 'June' },
      { color: '#eab308', colSpan: 5, rowSpan: 2, label: 'July' },
      { color: '#f97316', colSpan: 3, rowSpan: 2, label: 'August' },
      { color: '#f43f5e', colSpan: 8, rowSpan: 2, label: 'September' },
    ],
  },
} satisfies Record<string, { label: string; tiles: Tile[] }>;

type PresetKey = keyof typeof presets;
const presetKeys = Object.keys(presets) as PresetKey[];

const FADE_MS = 220;

export function MosaicPreviewToggle() {
  const [active, setActive] = React.useState<PresetKey>('deterministic');
  const [visible, setVisible] = React.useState<PresetKey>('deterministic');
  const [fading, setFading] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const pendingRef = React.useRef<PresetKey | null>(null);

  const switchTo = React.useCallback(
    (key: PresetKey) => {
      if (key === active || fading) return;
      pendingRef.current = key;
      setFading(true);
      setActive(key);
      setTimeout(() => {
        const next = pendingRef.current;
        if (next) setVisible(next);
        setFading(false);
        pendingRef.current = null;
      }, FADE_MS);
    },
    [active, fading],
  );

  const { tiles } = presets[visible];

  return (
    <>
      <div className="pageMeta" style={{ marginBottom: 12 }}>
        <div className="pageTagline" style={{ fontWeight: 650, fontSize: 16 }}>
          Glass mosaic preview
        </div>
        <div className="previewTabs">
          {presetKeys.map((key) => (
            <button
              key={key}
              className={`previewTab${active === key ? ' previewTabActive' : ''}`}
              onClick={() => switchTo(key)}
            >
              {presets[key].label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="mosaicPreview"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? 'scale(0.97)' : 'scale(1)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {tiles.map((tile, index) => (
          <div
            key={`${visible}-${tile.color}-${index}`}
            className="glassTile"
            style={
              {
                '--tile': tile.color,
                gridColumn: `span ${tile.colSpan}`,
                gridRow: `span ${tile.rowSpan}`,
                opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1,
                transition:
                  'opacity 220ms ease, transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease',
              } as CSSProperties
            }
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {tile.label && <span className="tileLabel">{tile.label}</span>}
          </div>
        ))}
      </div>
    </>
  );
}
