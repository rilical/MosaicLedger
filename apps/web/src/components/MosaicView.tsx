'use client';

import * as React from 'react';
import type { TreemapTile } from '@mosaicledger/mosaic';

export function MosaicView({ tiles }: { tiles: TreemapTile[] }) {
  const [hover, setHover] = React.useState<TreemapTile | null>(null);

  return (
    <div>
      <svg viewBox="0 0 1000 650" width="100%" height="auto" role="img">
        <rect x={0} y={0} width={1000} height={650} fill="rgba(255,255,255,0.02)" />
        {tiles.map((t) => (
          <g
            key={t.id}
            onMouseEnter={() => setHover(t)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'default' }}
          >
            <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={10} fill={t.color} opacity={0.92} />
            {t.w > 170 && t.h > 46 ? (
              <text x={t.x + 14} y={t.y + 26} fontSize={16} fill="rgba(0,0,0,0.80)">
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
