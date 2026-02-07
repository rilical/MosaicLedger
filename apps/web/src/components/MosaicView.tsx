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
        {tiles.map((t) => (
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
              rx={10}
              fill={t.color}
              opacity={selectedId && selectedId !== t.id ? 0.35 : 0.78}
              filter="url(#glass-shadow)"
              stroke={selectedId === t.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
              strokeWidth={selectedId === t.id ? 2 : 1}
            />
            {t.w > 80 && t.h > 30 ? (
              <text
                x={t.x + 12}
                y={t.y + 24}
                fontSize={13}
                fontWeight={600}
                fill="rgba(255,255,255,0.95)"
                filter="url(#text-shadow)"
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
