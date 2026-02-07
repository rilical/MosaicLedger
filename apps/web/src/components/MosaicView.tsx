'use client';

import * as React from 'react';
import type { TreemapTile } from '@mosaicledger/mosaic';

export function MosaicView({ tiles }: { tiles: TreemapTile[] }) {
  const [hover, setHover] = React.useState<TreemapTile | null>(null);

  return (
    <div className="mosaicFrame">
      <svg viewBox="0 0 1000 650" className="mosaicCanvas" role="img">
        <defs>
          <linearGradient id="glass-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="glass-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.45)" />
          </filter>
        </defs>
        <rect x={0} y={0} width={1000} height={650} fill="rgba(255,255,255,0.02)" />
        {tiles.map((t) => (
          <g
            key={t.id}
            onMouseEnter={() => setHover(t)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'default' }}
          >
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              rx={10}
              fill={t.color}
              opacity={0.78}
              filter="url(#glass-shadow)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
            />
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              rx={10}
              fill="url(#glass-shine)"
              opacity={0.45}
            />
            {t.w > 170 && t.h > 46 ? (
              <text x={t.x + 14} y={t.y + 26} fontSize={16} fill="rgba(0,0,0,0.78)">
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
