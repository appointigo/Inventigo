export type CatalogPrice = {
  amountMinor: number;
  currency: string;
  interval: "MONTH" | "YEAR";
  taxMode: "INCLUSIVE" | "EXCLUSIVE";
};

export type ProviderPlan = {
  id: string;
  period: string;
  interval: number;
  item: { amount: number | string; currency: string; tax_inclusive: boolean };
};

/** A dashboard plan must match the immutable catalog price exactly. */
export function assertRazorpayPlanMatches(price: CatalogPrice, plan: ProviderPlan): void {
  const period = price.interval === "MONTH" ? "monthly" : "yearly";
  if (
    plan.period !== period ||
    plan.interval !== 1 ||
    Number(plan.item.amount) !== price.amountMinor ||
    plan.item.currency !== price.currency ||
    plan.item.tax_inclusive !== (price.taxMode === "INCLUSIVE")
  ) {
    throw new Error(`Razorpay plan ${plan.id} differs from the catalog price`);
  }
}
