'use client';

import * as React from 'react';

type Rect = { x: number; y: number; w: number; h: number };

const RECTS: Rect[] = [
  { x: 18, y: 18, w: 420, h: 150 },
  { x: 454, y: 18, w: 528, h: 150 },
  { x: 18, y: 184, w: 260, h: 210 },
  { x: 294, y: 184, w: 340, h: 210 },
  { x: 650, y: 184, w: 332, h: 210 },
  { x: 18, y: 410, w: 350, h: 222 },
  { x: 384, y: 410, w: 260, h: 222 },
  { x: 660, y: 410, w: 322, h: 222 },
];

export function MosaicSkeleton(props: { label?: string }) {
  const label = props.label ?? 'Rendering mosaic…';

  return (
    <div className="mosaicFrame">
      <svg viewBox="0 0 1000 650" className="mosaicCanvas" role="img" aria-label={label}>
        <defs>
          <linearGradient id="ml-skeleton-shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
          <mask id="ml-skeleton-mask">
            <rect x="0" y="0" width="1000" height="650" fill="white" />
          </mask>
        </defs>

        <rect x={0} y={0} width={1000} height={650} rx={16} fill="rgba(255,255,255,0.03)" />

        {RECTS.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={12}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.10)"
          />
        ))}

        <g mask="url(#ml-skeleton-mask)" className="mlSkeletonShimmer">
          <rect x="-400" y="0" width="400" height="650" fill="url(#ml-skeleton-shimmer)" />
        </g>
      </svg>
      <div className="small" style={{ marginTop: 10 }}>
        {label}
      </div>
    </div>
  );
}
