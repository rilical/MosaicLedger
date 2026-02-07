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
  const { choices, setChoice, clearChoice } = useSubscriptionChoices();

  if (recurring.length === 0) {
    return <div className="small">No recurring charges detected yet.</div>;
  }

  return (
    <div className="recurringList">
      {recurring.map((r) => (
        <div key={r.id} className="recurringItem">
          {(() => {
            const choice = choices[r.merchant];
            const is = (c: typeof choice) => choice === c;
            return (
              <>
          <div className="recurringHeader">
            <div>
              <div className="recurringTitle">{r.merchant}</div>
              <div className="small">
                {r.cadence} · next {r.nextDate} · confidence {(r.confidence * 100).toFixed(0)}%
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                ~${formatMonthlyEquivalent(r).toFixed(2)}/mo · ${formatAnnual(r).toFixed(2)}/yr
              </div>
              {choice ? (
                <div className="small" style={{ marginTop: 6 }}>
                  Choice: <b>{choice.toUpperCase()}</b>
                </div>
              ) : null}
            </div>
            <div className="money">${r.expectedAmount.toFixed(2)}</div>
          </div>

          <div
            className="recurringBtns"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}
          >
            <button
              type="button"
              className={`btn recurringBtn recurringBtnKeep${is('keep') ? ' on' : ''}`}
              onClick={() => setChoice(r.merchant, 'keep')}
              aria-pressed={is('keep')}
            >
              Keep
            </button>
            <button
              type="button"
              className={`btn recurringBtn recurringBtnCancel${is('cancel') ? ' on' : ''}`}
              onClick={() => setChoice(r.merchant, 'cancel')}
              aria-pressed={is('cancel')}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn recurringBtn recurringBtnDowngrade${is('downgrade') ? ' on' : ''}`}
              onClick={() => setChoice(r.merchant, 'downgrade')}
              aria-pressed={is('downgrade')}
            >
              Downgrade
            </button>
            {choice ? (
              <button
                type="button"
                className="btn recurringBtn"
                onClick={() => clearChoice(r.merchant)}
                title="Clear choice"
              >
                Clear
              </button>
            ) : null}
          </div>
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
