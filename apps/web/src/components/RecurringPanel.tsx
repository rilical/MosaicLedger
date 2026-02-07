'use client';

import type { RecurringCharge } from '@mosaicledger/core';
import { useSubscriptionChoices } from '../lib/subscriptions/choices';

function formatMonthlyEquivalent(r: RecurringCharge): number {
  switch (r.cadence) {
    case 'weekly':
      return (r.expectedAmount * 52) / 12;
    case 'biweekly':
      return (r.expectedAmount * 26) / 12;
    case 'monthly':
      return r.expectedAmount;
    default:
      return r.cadence satisfies never;
  }
}

function formatAnnual(r: RecurringCharge): number {
  switch (r.cadence) {
    case 'weekly':
      return r.expectedAmount * 52;
    case 'biweekly':
      return r.expectedAmount * 26;
    case 'monthly':
      return r.expectedAmount * 12;
    default:
      return r.cadence satisfies never;
  }
}

export function RecurringPanel({ recurring }: { recurring: RecurringCharge[] }) {
  const { choices, setChoice } = useSubscriptionChoices();

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
              <div className="small" style={{ opacity: 0.9 }}>
                ~${formatMonthlyEquivalent(r).toFixed(2)}/mo · ${formatAnnual(r).toFixed(2)}/yr
              </div>
            </div>
            <div className="money">${r.expectedAmount.toFixed(2)}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className={choices[r.merchant] === 'keep' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setChoice(r.merchant, 'keep')}
              style={{
                transition: 'background 140ms ease, border-color 140ms ease',
              }}
              onMouseEnter={(e) => {
                if (choices[r.merchant] !== 'keep') {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.18)';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (choices[r.merchant] !== 'keep') {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.borderColor = '';
                }
              }}
            >
              Keep
            </button>
            <button
              type="button"
              className={choices[r.merchant] === 'cancel' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setChoice(r.merchant, 'cancel')}
              style={{
                transition: 'background 140ms ease, border-color 140ms ease',
              }}
              onMouseEnter={(e) => {
                if (choices[r.merchant] !== 'cancel') {
                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.18)';
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (choices[r.merchant] !== 'cancel') {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.borderColor = '';
                }
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={choices[r.merchant] === 'downgrade' ? 'btn btnPrimary' : 'btn'}
              onClick={() => setChoice(r.merchant, 'downgrade')}
              style={{
                transition: 'background 140ms ease, border-color 140ms ease',
              }}
              onMouseEnter={(e) => {
                if (choices[r.merchant] !== 'downgrade') {
                  e.currentTarget.style.background = 'rgba(234, 179, 8, 0.18)';
                  e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (choices[r.merchant] !== 'downgrade') {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.borderColor = '';
                }
              }}
            >
              Downgrade
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
