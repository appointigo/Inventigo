export type MoneyValue = number | string | { toFixed(digits: number): string } | null | undefined;

export const toMinorUnits = (value: MoneyValue) => {
  const fixed =
    typeof value === "object" && value !== null ? value.toFixed(2) : Number(value ?? 0).toFixed(2);
  const negative = fixed.startsWith("-");
  const [whole, fraction = "00"] = fixed.replace("-", "").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -minor : minor;
};

export const fromMinorUnits = (value: number) => value / 100;
export const roundMoney = (value: MoneyValue) => fromMinorUnits(toMinorUnits(value));
export const sumMoney = (values: MoneyValue[]) =>
  fromMinorUnits(values.reduce<number>((sum, value) => sum + toMinorUnits(value), 0));

export function allocateMoney(total: MoneyValue, weights: number[]) {
  const totalMinor = toMinorUnits(total);
  const safeWeights = weights.map((weight) => Math.max(0, Number(weight) || 0));
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (!safeWeights.length) return [];
  if (weightTotal === 0) return safeWeights.map(() => 0);
  const raw = safeWeights.map((weight) => (totalMinor * weight) / weightTotal);
  const allocated = raw.map(Math.floor);
  let remainder = totalMinor - allocated.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let cursor = 0; remainder > 0; cursor += 1, remainder -= 1) {
    allocated[order[cursor % order.length].index] += 1;
  }
  return allocated.map(fromMinorUnits);
}

export function canonicalReturnRevenueAdjustment(input: {
  netAmount: MoneyValue;
  refundAmount: MoneyValue;
}) {
  return fromMinorUnits(toMinorUnits(input.netAmount) - toMinorUnits(input.refundAmount));
}

export function canonicalCustomerOrderValue(input: {
  saleAmount: MoneyValue;
  returns: Array<{ netAmount: MoneyValue; refundAmount: MoneyValue }>;
}) {
  const adjustment = input.returns.reduce(
    (sum, row) => sum + toMinorUnits(canonicalReturnRevenueAdjustment(row)),
    0
  );
  return fromMinorUnits(Math.max(0, toMinorUnits(input.saleAmount) + adjustment));
}

export function canonicalInventoryValue(
  rows: Array<{ quantity: number; unitCost: MoneyValue; unitRetail?: MoneyValue }>
) {
  return rows.reduce(
    (summary, row) => {
      const quantity = Math.max(0, row.quantity);
      summary.units += quantity;
      summary.costMinor += quantity * toMinorUnits(row.unitCost);
      summary.retailMinor += quantity * toMinorUnits(row.unitRetail ?? 0);
      return summary;
    },
    { units: 0, costMinor: 0, retailMinor: 0 }
  );
}

export function canonicalSettlementTotals(entries: Array<{ amount: MoneyValue }>) {
  const positive = entries.filter((row) => toMinorUnits(row.amount) > 0);
  const negative = entries.filter((row) => toMinorUnits(row.amount) < 0);
  const collectionsMinor = positive.reduce((sum, row) => sum + toMinorUnits(row.amount), 0);
  const refundsPaidMinor = negative.reduce(
    (sum, row) => sum + Math.abs(toMinorUnits(row.amount)),
    0
  );
  return {
    collections: fromMinorUnits(collectionsMinor),
    refundsPaid: fromMinorUnits(refundsPaidMinor),
    netCustomerMovement: fromMinorUnits(collectionsMinor - refundsPaidMinor),
  };
}
