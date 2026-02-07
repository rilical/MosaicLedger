'use client';

import * as React from 'react';
import type { TreemapTile } from '@mosaicledger/mosaic';

export function MosaicView(props: {
  tiles: TreemapTile[];
  nestedTiles?: TreemapTile[];
  totalSpend?: number;
  selectedId?: string;
  onTileClick?: (tile: TreemapTile) => void;
}) {
  const { tiles, nestedTiles = [], totalSpend, selectedId, onTileClick } = props;
  const [hover, setHover] = React.useState<TreemapTile | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Trigger transition animation when tiles change (e.g., drilling down)
  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [tiles.length, tiles.map((t) => t.id).join(',')]);

  const PADDING = 16;
  const CHAR_WIDTH_RATIO = 0.58;
  const hasTotalSpend = typeof totalSpend === 'number' && Number.isFinite(totalSpend);
  const hasPositiveTotalSpend = hasTotalSpend && totalSpend > 0;

  // Calculate dynamic font size based on tile area
  const calculateFontSize = (tile: TreemapTile): number => {
    const area = tile.w * tile.h;
    const baseSize = 13;
    const maxSize = 24;
    const minSize = 11;

    // Scale font size based on area (larger tiles = larger text)
    const scaleFactor = Math.sqrt(area) / 40;
    const fontSize = baseSize * scaleFactor;

    return Math.min(maxSize, Math.max(minSize, fontSize));
  };

  // Only show label if it fits inside the box (avoid overflow)
  const fitLabel = (tile: TreemapTile, fs: number): string | null => {
    const availW = tile.w - PADDING * 2;
    const availH = tile.h - PADDING * 2;
    const maxChars = Math.floor(availW / (fs * CHAR_WIDTH_RATIO));
    const lineHeight = fs * 1.2;
    if (availW <= 24 || availH <= lineHeight) return null;
    if (maxChars <= 4) return null;
    if (tile.label.length <= maxChars) return tile.label;
    return tile.label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
  };

  // Font matching the MosaicLedger nav title (Fraunces serif)
  const BRAND_FONT = "'Fraunces', 'Times New Roman', serif";

  // Nested tile: centered label, dynamic font size to fit box, vertical when height > width
  const NESTED_CHAR_RATIO = 0.65; // Fraunces bold is wide; conservative so text stays inside
  const NESTED_LINE_RATIO = 1.25;
  const NESTED_FONT_MIN = 6;
  const SAFETY = 0.88; // render at 88% of computed size so text never overflows
  function getNestedLabelConfig(tile: TreemapTile): {
    fontSize: number;
    label: string;
    vertical: boolean;
  } {
    const vertical = tile.h > tile.w;
    const label = tile.label || '';
    if (label.length === 0)
      return { fontSize: NESTED_FONT_MIN, label: '', vertical: false };

    const area = tile.w * tile.h;
    const NESTED_FONT_MAX = Math.min(26, Math.max(12, 6 + Math.sqrt(area) / 14));
    // Small boxes: use less of the box so text stays clearly inside; large boxes can use more
    const useFraction = area < 4000 ? 0.76 : area < 12000 ? 0.82 : 0.88;

    let fontSize: number;
    if (vertical) {
      const byLength = (tile.h * useFraction) / (label.length * NESTED_CHAR_RATIO);
      const byHeight = (tile.w * useFraction) / NESTED_LINE_RATIO;
      fontSize = Math.min(byLength, byHeight);
    } else {
      const byLength = (tile.w * useFraction) / (label.length * NESTED_CHAR_RATIO);
      const byHeight = (tile.h * useFraction) / NESTED_LINE_RATIO;
      fontSize = Math.min(byLength, byHeight);
    }
    fontSize = Math.max(NESTED_FONT_MIN, Math.min(NESTED_FONT_MAX, fontSize));
    fontSize = Math.round(fontSize * SAFETY);

    let displayLabel = label;
    if (vertical) {
      const maxChars = Math.max(1, Math.floor((tile.h * useFraction * SAFETY) / (fontSize * NESTED_CHAR_RATIO)) - 1);
      if (label.length > maxChars)
        displayLabel = label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
    } else {
      const maxChars = Math.max(1, Math.floor((tile.w * useFraction * SAFETY) / (fontSize * NESTED_CHAR_RATIO)) - 1);
      if (label.length > maxChars)
        displayLabel = label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
    }
    return { fontSize: Math.max(NESTED_FONT_MIN, fontSize), label: displayLabel, vertical };
  }

  const hoverPct =
    hover && hasPositiveTotalSpend ? Math.min(1, Math.max(0, hover.value / totalSpend)) : 0;

  return (
    <div className="mosaicFrame">
      <div className="mosaicHud" aria-hidden>
        <div className="mosaicHudCard">
          <div className="mosaicSwatch" style={{ background: hover ? hover.color : undefined }} />
          <div style={{ display: 'grid', gap: 2 }}>
            <div className="mosaicHudTitle">{hover ? hover.label : 'Hover a tile'}</div>
            <div className="mosaicHudValue">
              {hover
                ? `$${hover.value.toFixed(2)}${
                    hasPositiveTotalSpend ? ` · ${(hoverPct * 100).toFixed(1)}%` : ''
                  }`
                : hasTotalSpend
                  ? `Total: $${totalSpend.toFixed(2)}`
                  : 'Click a tile to drill down'}
            </div>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 1000 650" className="mosaicCanvas" role="img">
        <defs>
          <filter id="glass-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.45)" />
          </filter>
          <filter id="text-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.6)" />
          </filter>
        </defs>
        <rect x={0} y={0} width={1000} height={650} fill="rgba(255,255,255,0.02)" />
        {tiles.map((t, index) => {
          const fs = calculateFontSize(t);
          const label = t.w > 80 && t.h > 30 ? fitLabel(t, fs) : null;

          return (
            <g
              key={t.id}
              onMouseEnter={() => setHover(t)}
              onMouseLeave={() => setHover(null)}
              onClick={onTileClick ? () => onTileClick(t) : undefined}
              onKeyDown={
                onTileClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onTileClick(t);
                    }
                  : undefined
              }
              role={onTileClick ? 'button' : undefined}
              tabIndex={onTileClick ? 0 : -1}
              aria-label={onTileClick ? `Open ${t.label}` : undefined}
              style={{
                cursor: onTileClick ? 'pointer' : 'default',
                transform: isTransitioning ? 'scale(0.8)' : 'scale(1)',
                transformOrigin: '500px 325px',
                opacity: isTransitioning ? 0 : 1,
                transition: `transform 400ms ease ${index * 30}ms, opacity 400ms ease ${
                  index * 30
                }ms`,
              }}
            >
              <title>
                {t.label} · ${t.value.toFixed(2)}
              </title>
              <rect
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                rx={10}
                fill={t.color}
                opacity={selectedId && selectedId !== t.id ? 0.35 : 0.78}
                filter="url(#glass-shadow)"
                stroke={selectedId === t.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
                strokeWidth={selectedId === t.id ? 2 : 1}
                style={{
                  transform: hover === t ? 'translate(-2px, -4px)' : 'translate(0, 0)',
                  transition: 'transform 180ms ease, opacity 180ms ease',
                }}
              />
              {label ? (
                <text
                  x={t.x + 12}
                  y={t.y + fs + 8}
                  fontSize={fs}
                  fontWeight={700}
                  fontFamily={BRAND_FONT}
                  fill="rgba(255,255,255,0.95)"
                  filter="url(#text-shadow)"
                  style={{
                    transition: 'font-size 180ms ease',
                  }}
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        {nestedTiles.map((t) => {
          const cx = t.x + t.w / 2;
          const cy = t.y + t.h / 2;
          const { fontSize, label: displayLabel, vertical } = getNestedLabelConfig(t);
          const showLabel = t.w >= 14 && t.h >= 14 && displayLabel.length > 0;
          return (
            <g
              key={t.id}
              onMouseEnter={() => setHover(t)}
              onMouseLeave={() => setHover(null)}
              onClick={onTileClick ? () => onTileClick(t) : undefined}
              role={onTileClick ? 'button' : undefined}
              tabIndex={onTileClick ? 0 : -1}
              aria-label={onTileClick ? `${t.label} · $${t.value.toFixed(2)}` : undefined}
              style={{ cursor: onTileClick ? 'pointer' : 'default' }}
            >
              <title>
                {t.label} · ${t.value.toFixed(2)}
              </title>
              <rect
                x={t.x}
                y={t.y}
                width={t.w}
                height={t.h}
                rx={8}
                fill="rgba(255,255,255,0.18)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1}
              />
              {showLabel ? (
                <text
                  x={cx}
                  y={cy}
                  fontSize={fontSize}
                  fontWeight={700}
                  fontFamily={BRAND_FONT}
                  fill="rgba(255,255,255,0.95)"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={vertical ? `rotate(-90, ${cx}, ${cy})` : undefined}
                >
                  {displayLabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
