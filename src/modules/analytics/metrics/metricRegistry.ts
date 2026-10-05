type MetricDefinition = {
  label: string;
  definition: string;
  source: string;
  scope: "store-period" | "store-current";
  requires: readonly string[];
};

export const metricRegistry = {
  revenue: { label: "Revenue", definition: "Final tax-inclusive billed totals after discounts and rounding, less historical returned-line value, plus replacement exchange-line value.", source: "Sale totals and itemized ReturnTransaction lines", scope: "store-period", requires: ["itemizedReturns"] },
  orders: { label: "Orders", definition: "Completed sale invoices. A return or exchange does not create another order.", source: "Sale", scope: "store-period", requires: [] },
  discounts: { label: "Discounts", definition: "Persisted invoice and exchange discount amounts, including allocated line and promotional pricing reflected in the final bill.", source: "Sale and ReturnTransaction pricing snapshots", scope: "store-period", requires: ["pricingSnapshots"] },
  cogs: { label: "COGS", definition: "Immutable sale-time and replacement-exchange unit costs, net of original cost reversed for returned items.", source: "SaleItem.costPrice and ReturnTransactionItem.newCostPrice", scope: "store-period", requires: ["completeCogs"] },
  grossProfit: { label: "Gross Profit", definition: "Revenue minus COGS.", source: "Canonical financial event aggregation", scope: "store-period", requires: ["completeCogs"] },
  operatingExpenses: { label: "Operating Expenses", definition: "Approved, persisted operating expenses in the selected accounting period.", source: "Expense ledger", scope: "store-period", requires: ["approvedExpenses"] },
  netProfit: { label: "Net Profit", definition: "Gross profit minus approved operating expenses.", source: "Canonical profitability aggregation", scope: "store-period", requires: ["completeCogs", "approvedExpenses"] },
  averageOrderValue: { label: "Average Order Value", definition: "Net revenue divided by completed sale invoice count; zero when no orders exist.", source: "Canonical financial event aggregation", scope: "store-period", requires: ["itemizedReturns"] },
  customers: { label: "Customers", definition: "Distinct persisted customer records linked to store activity; anonymous walk-ins are excluded.", source: "Customer links on Sale, ReturnTransaction, and CustomerVisit", scope: "store-period", requires: ["customerLinks"] },
  inventoryValue: { label: "Current Inventory Value", definition: "Sum of max(0, current on-hand quantity) multiplied by current product cost.", source: "StockEntry and Product.costPrice", scope: "store-current", requires: ["validCurrentStock", "productCost"] },
  demandFulfilment: { label: "Demand Fulfilment", definition: "Fulfilled observed demand quantity divided by total observed demand quantity.", source: "DemandRequest evidence", scope: "store-period", requires: ["observedDemandEvidence"] },
  receivables: { label: "Receivables", definition: "Outstanding amount due on non-refunded partial-payment sales.", source: "Sale.amountDue and payment status", scope: "store-current", requires: ["paymentLedger"] },
} as const satisfies Record<string, MetricDefinition>;

export type CanonicalMetric = keyof typeof metricRegistry;
