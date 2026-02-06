import { describe, expect, it } from 'vitest';
import { normalizeMerchantName } from '../src/normalize';

describe('normalizeMerchantName', () => {
  it('normalizes common POS noise and uppercases', () => {
    expect(normalizeMerchantName('STARBUCKS 04567 POS PURCHASE')).toBe('STARBUCKS');
  });
});
