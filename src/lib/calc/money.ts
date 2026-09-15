import Decimal from "decimal.js";

// A cloned constructor scoped to this module (not the global `Decimal`
// static config) so importing this file can't silently change rounding
// behavior for any other decimal.js consumer in the process.
export const Money = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
export type MoneyValue = InstanceType<typeof Money>;

export function toMoney(value: string | number | MoneyValue): MoneyValue {
  return new Money(value);
}

// Round once, at the very end of a calculation — never round per-line and
// re-sum (plan.md's rule). ROUND_HALF_UP here is the documented, overridable
// default; a different company rounding policy would change only this line.
export function roundMoney(value: MoneyValue): MoneyValue {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

// The only representation money takes crossing an API/DB boundary — a
// fixed 2-decimal string, never a JS number (plan.md's "Decimal boundary
// risk").
export function toMoneyString(value: MoneyValue): string {
  return roundMoney(value).toFixed(2);
}

export function sumMoney(values: MoneyValue[]): MoneyValue {
  return values.reduce((acc, v) => acc.plus(v), new Money(0));
}
