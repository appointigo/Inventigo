export const DATA_COMPLETENESS_REASONS = [
  "MISSING_SALE_ITEM_COST",
  "LEGACY_RETURN_WITHOUT_ITEMS",
  "MISSING_EXCHANGE_REPLACEMENT_COST",
  "AMBIGUOUS_STOCK_ADJUSTMENT",
  "MISSING_PAYMENT_LEDGER",
  "MISSING_CUSTOMER_LINK",
] as const;

export type DataCompletenessReason = (typeof DATA_COMPLETENESS_REASONS)[number];
export type DataCompletenessStatus = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";

export type DataCompleteness = {
  status: DataCompletenessStatus;
  reasons: DataCompletenessReason[];
};

export const completeData = (): DataCompleteness => ({ status: "COMPLETE", reasons: [] });

export function dataCompleteness(
  reasons: Iterable<DataCompletenessReason>,
  unavailable = false,
): DataCompleteness {
  const unique = [...new Set(reasons)];
  return {
    status: unique.length === 0 ? "COMPLETE" : unavailable ? "UNAVAILABLE" : "PARTIAL",
    reasons: unique,
  };
}
