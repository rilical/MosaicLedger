'use client';

import type { RecurringCharge } from '@mosaicledger/core';

export function RecurringPanel({ recurring }: { recurring: RecurringCharge[] }) {
  if (recurring.length === 0) {
    return <div className="small">No recurring charges detected yet.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {recurring.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 10,
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 650 }}>{r.merchant}</div>
              <div className="small">
                {r.cadence} · next {r.nextDate} · confidence {(r.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>${r.expectedAmount.toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
