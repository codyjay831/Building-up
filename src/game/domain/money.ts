/** Whole-dollar money helpers. Simulation code must not use floating-point cents. */

export type Money = number;

const MONEY_PATTERN = /^-?\d+$/;

export function assertWholeDollars(amount: Money, label = 'amount'): Money {
  if (!Number.isFinite(amount) || !MONEY_PATTERN.test(String(amount))) {
    throw new RangeError(`${label} must be a whole-dollar integer, received ${String(amount)}`);
  }

  return amount;
}

export function addMoney(left: Money, right: Money): Money {
  return assertWholeDollars(left) + assertWholeDollars(right);
}

export function subtractMoney(left: Money, right: Money): Money {
  return assertWholeDollars(left) - assertWholeDollars(right);
}

export function sumMoney(amounts: readonly Money[]): Money {
  return amounts.reduce<Money>((total, amount) => addMoney(total, amount), 0);
}

export function compareMoney(left: Money, right: Money): number {
  return assertWholeDollars(left) - assertWholeDollars(right);
}

export function isNonNegative(amount: Money): boolean {
  return assertWholeDollars(amount) >= 0;
}

export function hasSufficientCash(cash: Money, required: Money): boolean {
  return compareMoney(cash, required) >= 0;
}

export function formatMoney(amount: Money): string {
  const normalized = assertWholeDollars(amount);
  const sign = normalized < 0 ? '-' : '';
  const absolute = Math.abs(normalized);
  return `${sign}$${absolute.toLocaleString('en-US')}`;
}
