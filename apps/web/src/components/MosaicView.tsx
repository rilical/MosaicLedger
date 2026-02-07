'use client';

import * as React from 'react';
import type { TreemapTile } from '@mosaicledger/mosaic';

export function MosaicView(props: {
  tiles: TreemapTile[];
  nestedTiles?: TreemapTile[];
  totalSpend?: number;
  selectedId?: string;
  onTileClick?: (tile: TreemapTile) => void;
  height?: number;
  showHud?: boolean;
}) {
  const {
    tiles,
    nestedTiles = [],
    totalSpend,
    selectedId,
    onTileClick,
    height,
    showHud = true,
  } = props;
  const [hover, setHover] = React.useState<TreemapTile | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Trigger transition animation when tiles change (e.g., drilling down)
  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [tiles.length, tiles.map((t) => t.id).join(',')]);

  const _PADDING = 16;
  const _CHAR_WIDTH_RATIO = 0.58;
  const numberTotalSpend =
    typeof totalSpend === 'number' && Number.isFinite(totalSpend) ? totalSpend : undefined;
  const tilesTotal = React.useMemo(() => {
    let sum = 0;
    for (const t of tiles) sum += t.value;
    return sum;
  }, [tiles]);
  // Use the current view's total (category view, merchant drill-down, or timeline).
  // If tiles are empty, fall back to the passed totalSpend (used by the HUD "Total" line).
  const viewTotal = tiles.length > 0 ? tilesTotal : numberTotalSpend ?? 0;
  const hasPositiveViewTotal = Number.isFinite(viewTotal) && viewTotal > 0;

  const moneyFmt = React.useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  }, []);
  const pctFmt = React.useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    });
  }, []);
  const tileById = React.useMemo(() => {
    const m = new Map<string, TreemapTile>();
    for (const t of tiles) m.set(t.id, t);
    return m;
  }, [tiles]);

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

  const PILL_CHAR_RATIO = 0.6;
  const PILL_XPAD = 10;
  const PILL_YPAD = 6;
  const PILL_GAP = 6;

  function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
  }

  function fitSingleLine(text: string, fs: number, maxW: number): string | null {
    const usable = maxW - PILL_XPAD * 2;
    if (usable <= fs * 3) return null;
    const maxChars = Math.max(0, Math.floor(usable / (fs * PILL_CHAR_RATIO)));
    if (maxChars <= 3) return null;
    if (text.length <= maxChars) return text;
    return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
  }

  function pillDims(text: string, fs: number, maxW: number): { w: number; h: number } {
    const estW = text.length * fs * PILL_CHAR_RATIO + PILL_XPAD * 2;
    const w = clamp(estW, Math.min(40, maxW), maxW);
    const h = fs * 1.1 + PILL_YPAD * 2;
    return { w, h };
  }

  function insightForShare(share: number): string | null {
    if (!Number.isFinite(share) || share <= 0) return null;
    if (share >= 0.5) return 'Over half of spend';
    if (share >= 0.25) return 'Quarter+ of spend';
    if (share >= 0.1) return '10%+ of spend';
    return null;
  }

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
    if (label.length === 0) return { fontSize: NESTED_FONT_MIN, label: '', vertical: false };

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
      const maxChars = Math.max(
        1,
        Math.floor((tile.h * useFraction * SAFETY) / (fontSize * NESTED_CHAR_RATIO)) - 1,
      );
      if (label.length > maxChars)
        displayLabel = label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
    } else {
      const maxChars = Math.max(
        1,
        Math.floor((tile.w * useFraction * SAFETY) / (fontSize * NESTED_CHAR_RATIO)) - 1,
      );
      if (label.length > maxChars)
        displayLabel = label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
    }
    return { fontSize: Math.max(NESTED_FONT_MIN, fontSize), label: displayLabel, vertical };
  }

  const hoverPct =
    hover && hasPositiveViewTotal ? Math.min(1, Math.max(0, hover.value / viewTotal)) : 0;

  return (
    <div className="mosaicFrame">
      {showHud ? (
        <div className="mosaicHud" aria-hidden>
          <div className="mosaicHudCard">
            <div
              className="mosaicSwatch"
              style={{ background: hover ? hover.color : undefined }}
            />
            <div style={{ display: 'grid', gap: 2 }}>
              <div className="mosaicHudTitle">{hover ? hover.label : 'Hover a tile'}</div>
              <div className="mosaicHudValue">
                {hover
                  ? `${moneyFmt.format(hover.value)}${
                      hasPositiveViewTotal ? ` · ${pctFmt.format(hoverPct)}` : ''
                    }`
                  : Number.isFinite(viewTotal)
                    ? `Total: ${moneyFmt.format(viewTotal)}`
                    : 'Click a tile to drill down'}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <svg
        viewBox="0 0 1000 650"
        className="mosaicCanvas"
        role="img"
        style={height ? { height, width: '100%' } : undefined}
      >
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
          const nameFs = clamp(fs + 4, 12, 26);
          const metaFs = clamp(nameFs - 6, 10, 14);

          const maxPillW = Math.max(0, t.w - 24);
          const nameText = t.w > 70 && t.h > 26 ? fitSingleLine(t.label, nameFs, maxPillW) : null;
          const share = hasPositiveViewTotal ? t.value / viewTotal : 0;
          const metaText =
            t.w > 90 && t.h > 42
              ? fitSingleLine(
                  `${moneyFmt.format(t.value)}${hasPositiveViewTotal ? ` · ${pctFmt.format(share)}` : ''}`,
                  metaFs,
                  maxPillW,
                )
              : null;
          const insightText =
            t.w > 120 && t.h > 60 && hasPositiveViewTotal
              ? fitSingleLine(insightForShare(share) ?? '', metaFs, maxPillW)
              : null;

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
                {t.label} · {moneyFmt.format(t.value)}
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
              {(() => {
                if (!nameText) return null;
                const x0 = t.x + 12;
                const y0 = t.y + 12;

                const nameDim = pillDims(nameText, nameFs, maxPillW);
                const metaDim = metaText ? pillDims(metaText, metaFs, maxPillW) : null;
                const insightDim =
                  insightText && insightText.length > 0
                    ? pillDims(insightText, metaFs, maxPillW)
                    : null;

                // Keep the stack inside the tile; degrade gracefully as tiles get smaller.
                const maxStackH = Math.max(0, t.h - 24);
                const baseStackH =
                  nameDim.h +
                  (metaDim ? PILL_GAP + metaDim.h : 0) +
                  (insightDim ? PILL_GAP + insightDim.h : 0);

                const canShowInsight = insightDim != null && baseStackH <= maxStackH;
                const stackHNoInsight =
                  nameDim.h + (metaDim ? PILL_GAP + metaDim.h : 0);
                const canShowMeta = metaDim != null && stackHNoInsight <= maxStackH;

                const showMeta = canShowMeta;
                const showInsight = canShowInsight;

                return (
                  <g pointerEvents="none" aria-hidden>
                    <rect
                      x={x0}
                      y={y0}
                      width={nameDim.w}
                      height={nameDim.h}
                      rx={12}
                      fill="rgba(0,0,0,0.26)"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                    />
                    <text
                      x={x0 + PILL_XPAD}
                      y={y0 + nameFs + PILL_YPAD - 1}
                      fontSize={nameFs}
                      fontWeight={800}
                      fontFamily={BRAND_FONT}
                      fill="rgba(255,255,255,0.96)"
                      filter="url(#text-shadow)"
                      style={{ transition: 'font-size 180ms ease' }}
                    >
                      {nameText}
                    </text>

                    {showMeta && metaText ? (
                      (() => {
                        const my = y0 + nameDim.h + PILL_GAP;
                        const md = metaDim ?? pillDims(metaText, metaFs, maxPillW);
                        return (
                          <g>
                            <rect
                              x={x0}
                              y={my}
                              width={md.w}
                              height={md.h}
                              rx={12}
                              fill="rgba(0,0,0,0.22)"
                              stroke="rgba(255,255,255,0.16)"
                              strokeWidth={1}
                            />
                            <text
                              x={x0 + PILL_XPAD}
                              y={my + metaFs + PILL_YPAD - 1}
                              fontSize={metaFs}
                              fontWeight={750}
                              fontFamily={BRAND_FONT}
                              fill="rgba(255,255,255,0.9)"
                              style={{ fontVariantNumeric: 'tabular-nums' as const }}
                            >
                              {metaText}
                            </text>
                          </g>
                        );
                      })()
                    ) : null}

                    {showInsight && insightText && insightText.length > 0 ? (
                      (() => {
                        const iy =
                          y0 +
                          nameDim.h +
                          (showMeta && metaText ? PILL_GAP + (metaDim?.h ?? 0) : 0) +
                          PILL_GAP;
                        const id = insightDim ?? pillDims(insightText, metaFs, maxPillW);
                        return (
                          <g>
                            <rect
                              x={x0}
                              y={iy}
                              width={id.w}
                              height={id.h}
                              rx={12}
                              fill="rgba(255,255,255,0.14)"
                              stroke="rgba(255,255,255,0.18)"
                              strokeWidth={1}
                            />
                            <text
                              x={x0 + PILL_XPAD}
                              y={iy + metaFs + PILL_YPAD - 1}
                              fontSize={metaFs}
                              fontWeight={750}
                              fontFamily={BRAND_FONT}
                              fill="rgba(255,255,255,0.9)"
                            >
                              {insightText}
                            </text>
                          </g>
                        );
                      })()
                    ) : null}
                  </g>
                );
              })()}
            </g>
          );
        })}
        {nestedTiles.map((t) => {
          const cx = t.x + t.w / 2;
          const cy = t.y + t.h / 2;
          const { fontSize, label: displayLabel, vertical } = getNestedLabelConfig(t);
          const showLabel = t.w >= 14 && t.h >= 14 && displayLabel.length > 0;
          const [parentId] = t.id.split(':');
          const parent = parentId ? tileById.get(parentId) : undefined;
          const denom = parent && Number.isFinite(parent.value) && parent.value > 0 ? parent.value : 0;
          const nestedShare = denom > 0 ? t.value / denom : 0;
          const nestedMetaText = fitSingleLine(
            `${moneyFmt.format(t.value)}${denom > 0 ? ` · ${pctFmt.format(nestedShare)}` : ''}`,
            10,
            Math.max(0, t.w - 12),
          );
          const showMeta = t.w >= 70 && t.h >= 26 && !!nestedMetaText;

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
                {t.label} · {moneyFmt.format(t.value)}
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
              {showMeta && nestedMetaText ? (
                (() => {
                  const fs2 = 10;
                  const maxW = Math.max(0, t.w - 12);
                  const d = pillDims(nestedMetaText, fs2, maxW);
                  const x0 = t.x + 6;
                  const y0 = t.y + t.h - d.h - 6;
                  return (
                    <g pointerEvents="none" aria-hidden>
                      <rect
                        x={x0}
                        y={y0}
                        width={d.w}
                        height={d.h}
                        rx={10}
                        fill="rgba(0,0,0,0.22)"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={1}
                      />
                      <text
                        x={x0 + PILL_XPAD}
                        y={y0 + fs2 + PILL_YPAD - 2}
                        fontSize={fs2}
                        fontWeight={750}
                        fontFamily={BRAND_FONT}
                        fill="rgba(255,255,255,0.9)"
                        style={{ fontVariantNumeric: 'tabular-nums' as const }}
                      >
                        {nestedMetaText}
                      </text>
                    </g>
                  );
                })()
              ) : null}
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
