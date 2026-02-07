'use client';

import * as React from 'react';
import type { TreemapTile } from '@mosaicledger/mosaic';

export function MosaicView(props: {
  tiles: TreemapTile[];
  selectedId?: string;
  onTileClick?: (tile: TreemapTile) => void;
}) {
  const { tiles, selectedId, onTileClick } = props;
  const [hover, setHover] = React.useState<TreemapTile | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Trigger transition animation when tiles change (e.g., drilling down)
  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [tiles.length, tiles.map((t) => t.id).join(',')]);

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

  return (
    <div className="mosaicFrame">
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
        {tiles.map((t, index) => (
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
              transition: `transform 400ms ease ${index * 30}ms, opacity 400ms ease ${index * 30}ms`,
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
            {t.w > 80 && t.h > 30 ? (
              <text
                x={t.x + 12}
                y={t.y + calculateFontSize(t) + 8}
                fontSize={calculateFontSize(t)}
                fontWeight={600}
                fill="rgba(255,255,255,0.95)"
                filter="url(#text-shadow)"
                style={{
                  transition: 'font-size 180ms ease',
                }}
              >
                {t.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="small" style={{ marginTop: 10 }}>
        {hover ? (
          <div>
            <strong>{hover.label}</strong> · ${hover.value.toFixed(2)}
          </div>
        ) : (
          <div>Hover a tile to see details.</div>
        )}
      </div>
    </div>
  );
}
