export type MarkupResult = {
  profit: number;
  markupPercent: number;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function calculateMarkup(sellingPrice: number, costPrice: number): MarkupResult {
  if (!Number.isFinite(sellingPrice) || !Number.isFinite(costPrice)) {
    return { profit: 0, markupPercent: 0 };
  }

  // Markup is undefined when cost is zero/negative; return safe fallback.
  if (sellingPrice < 0 || costPrice <= 0) {
    return { profit: 0, markupPercent: 0 };
  }

  const profit = sellingPrice - costPrice;
  const markupPercent = (profit / costPrice) * 100;

  return {
    profit: round2(profit),
    markupPercent: round2(markupPercent),
  };
}
