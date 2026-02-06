'use client';

import type { ActionRecommendation } from '@mosaicledger/core';

export function ActionsPanel({ actions }: { actions: ActionRecommendation[] }) {
  if (actions.length === 0) {
    return <div className="small">Set a goal to generate ranked actions.</div>;
  }

  return (
    <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10 }}>
      {actions.map((a) => (
        <li key={a.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 650 }}>{a.title}</div>
              <div className="small">{a.explanation}</div>
            </div>
            <div style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              +${a.expectedMonthlySavings.toFixed(2)}/mo
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
