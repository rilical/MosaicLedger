import { describe, expect, test } from 'vitest';
import { mapNessiePurchasesToNormalized } from '../src/nessie/mapToNormalized';

describe('mapNessiePurchasesToNormalized', () => {
  test('maps basic purchases deterministically', () => {
    const out = mapNessiePurchasesToNormalized([
      {
        _id: 'p_1',
        amount: 12.34,
        description: 'Acme Coffee 1234 POS',
        purchase_date: '2026-02-01',
        type: 'Food',
      },
      {
        _id: 'p_2',
        amount: 55,
        description: 'Uber Eats',
        purchase_date: '2026-02-02',
        type: 'Dining',
      },
    ]);

    expect(out).toHaveLength(2);
    expect(out[0]!.date).toBe('2026-02-01');
    expect(out[0]!.amount).toBeCloseTo(12.34);
    expect(out[0]!.merchantRaw).toBe('Acme Coffee 1234 POS');
    expect(out[0]!.merchant).toBeTypeOf('string');
    expect(out[0]!.merchant).toContain('ACME');
    expect(out[0]!.category).toBe('Food');
    expect(out[0]!.source).toBe('bank');
    expect(out[0]!.id).toMatch(/^t_[0-9a-f]+$/);

    // Stable across runs
    const out2 = mapNessiePurchasesToNormalized([
      {
        _id: 'p_1',
        amount: 12.34,
        description: 'Acme Coffee 1234 POS',
        purchase_date: '2026-02-01',
        type: 'Food',
      },
    ]);
    expect(out2[0]!.id).toBe(out[0]!.id);
  });
});
