import { describe, expect, it } from 'vitest';
import { applyFixtureSyncState, getPlaidSyncFixture } from '@mosaicledger/banking';

describe('BANKP-017: Plaid sync fixture pack', () => {
  it('applies added/modified/removed deterministically', () => {
    const f = getPlaidSyncFixture();
    const state = applyFixtureSyncState(f);

    const ids = state.map((t) => t.transaction_id);
    // tx_demo_999 is removed but never existed; should not crash.
    expect(ids).not.toContain('tx_demo_999');

    // Modified transaction should be present with updated fields.
    const doorDash = state.find((t) => t.transaction_id === 'tx_demo_002');
    expect(doorDash).toBeTruthy();
    expect(doorDash?.pending).toBe(false);
    expect(doorDash?.amount).toBeCloseTo(20.31);

    // Sorting: newest first.
    const dates = state.map((t) => t.date);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    expect(dates).toEqual(sorted);
  });
});
