export const CENTS_PER_UNIT = 100;

export const toCents = (value: number | string): number => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * CENTS_PER_UNIT);
};

export const fromCents = (cents: number): number => {
  if (!Number.isFinite(cents)) return 0;
  return Number((cents / CENTS_PER_UNIT).toFixed(2));
};

export const roundTo2 = (value: number | string): number => fromCents(toCents(value));

export const roundToNearestRupee = (value: number | string): number => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

export const computeRoundOff = (netTotal: number) => {
  const normalizedNetTotal = roundTo2(netTotal);
  const finalPayable = roundToNearestRupee(normalizedNetTotal);
  const roundOffAmount = roundTo2(finalPayable - normalizedNetTotal);
  return {
    netTotal: normalizedNetTotal,
    roundOffAmount,
    finalPayable,
  };
};

export const allocateRoundedSharesCents = (totalCents: number, bases: number[]): number[] => {
  const normalizedTotal = Math.round(totalCents);
  const totalBase = bases.reduce((sum, base) => sum + Math.max(0, Math.round(base)), 0);
  if (normalizedTotal <= 0 || totalBase <= 0) {
    return bases.map(() => 0);
  }

  let allocated = 0;
  return bases.map((base, index) => {
    const normalizedBase = Math.max(0, Math.round(base));
    if (index === bases.length - 1) {
      return normalizedTotal - allocated;
    }
    const share = Math.round((normalizedTotal * normalizedBase) / totalBase);
    allocated += share;
    return share;
  });
};

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export const formatCurrencyFromCents = (cents: number): string => formatCurrency(fromCents(cents));
