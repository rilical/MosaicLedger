'use client';

import type { RecurringCharge } from '@mosaicledger/core';

export function RecurringPanel({ recurring }: { recurring: RecurringCharge[] }) {
  if (recurring.length === 0) {
    return <div className="small">No recurring charges detected yet.</div>;
  }

  return (
    <div className="recurringList">
      {recurring.map((r) => (
        <div key={r.id} className="recurringItem">
          <div className="recurringHeader">
            <div>
              <div className="recurringTitle">{r.merchant}</div>
              <div className="small">
                {r.cadence} · next {r.nextDate} · confidence {(r.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="money">${r.expectedAmount.toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
