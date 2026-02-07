'use client';

import type { ActionRecommendation } from '@mosaicledger/core';

export function ActionsPanel({ actions }: { actions: ActionRecommendation[] }) {
  if (actions.length === 0) {
    return <div className="small">Set a goal to generate ranked actions.</div>;
  }

  return (
    <ol className="actionList">
      {actions.map((a) => (
        <li key={a.id} className="actionItem">
          <div className="actionHeader">
            <div>
              <div className="actionTitle">{a.title}</div>
              <div className="small">{a.explanation}</div>
            </div>
            <div className="money">+${a.expectedMonthlySavings.toFixed(2)}/mo</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
