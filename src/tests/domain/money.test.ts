import { describe, expect, it } from 'vitest';

import {
  addMoney,
  assertWholeDollars,
  formatMoney,
  hasSufficientCash,
  subtractMoney,
  sumMoney,
} from '@/game/domain/money';

describe('money helpers', () => {
  it('adds and subtracts whole dollars', () => {
    expect(addMoney(180_000, 12_000)).toBe(192_000);
    expect(subtractMoney(180_000, 95_000)).toBe(85_000);
    expect(sumMoney([12_000, 3_000, 5_000])).toBe(20_000);
  });

  it('formats currency for display', () => {
    expect(formatMoney(180_000)).toBe('$180,000');
    expect(formatMoney(-2500)).toBe('-$2,500');
  });

  it('checks cash sufficiency without floating-point cents', () => {
    expect(hasSufficientCash(180_000, 95_000)).toBe(true);
    expect(hasSufficientCash(94_999, 95_000)).toBe(false);
  });

  it('rejects non-integer money values', () => {
    expect(() => assertWholeDollars(12.5)).toThrow(RangeError);
  });
});
