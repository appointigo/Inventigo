type MetricDefinition = {
  label: string;
  definition: string;
  source: string;
  scope: "store-period" | "store-current";
  requires: readonly string[];
};

export const metricRegistry = {
  grossSales: {
    label: "Gross Sales",
    definition: "Pre-discount merchandise value on completed sale invoices.",
    source: "Sale item original price snapshots",
    scope: "store-period",
    requires: ["pricingSnapshots"],
  },
  revenue: {
    label: "Net Sales",
    definition:
      "Final tax-inclusive billed sale totals plus each return's signed adjustment (netAmount minus refundAmount). Returned-line value and replacement pricing remain drill-down evidence, not an independent second revenue event.",
    source: "Sale.finalPayableAmount/total and ReturnTransaction.netAmount/refundAmount",
    scope: "store-period",
    requires: ["itemizedReturns"],
  },
  orders: {
    label: "Orders",
    definition: "Completed sale invoices. A return or exchange does not create another order.",
    source: "Sale",
    scope: "store-period",
    requires: [],
  },
  unitsSold: {
    label: "Units Sold",
    definition: "Sale item quantity minus returned quantity plus exchange replacement quantity.",
    source: "SaleItem and ReturnTransactionItem",
    scope: "store-period",
    requires: ["itemizedReturns"],
  },
  returns: {
    label: "Returns",
    definition:
      "Historical merchandise value accepted back from customers, independent of refund timing.",
    source: "ReturnTransactionItem.returnedLineAmount",
    scope: "store-period",
    requires: ["itemizedReturns"],
  },
  discounts: {
    label: "Discounts",
    definition:
      "Persisted invoice and exchange discount amounts, including allocated line and promotional pricing reflected in the final bill.",
    source: "Sale and ReturnTransaction pricing snapshots",
    scope: "store-period",
    requires: ["pricingSnapshots"],
  },
  cogs: {
    label: "COGS",
    definition:
      "Immutable sale-time and replacement-exchange unit costs, net of original cost reversed for returned items.",
    source: "SaleItem.costPrice and ReturnTransactionItem.newCostPrice",
    scope: "store-period",
    requires: ["completeCogs"],
  },
  grossProfit: {
    label: "Gross Profit",
    definition: "Revenue minus COGS.",
    source: "Canonical financial event aggregation",
    scope: "store-period",
    requires: ["completeCogs"],
  },
  operatingExpenses: {
    label: "Operating Expenses",
    definition: "Approved, persisted operating expenses in the selected accounting period.",
    source: "Expense ledger",
    scope: "store-period",
    requires: ["approvedExpenses"],
  },
  netProfit: {
    label: "Net Profit",
    definition: "Gross profit minus approved operating expenses.",
    source: "Canonical profitability aggregation",
    scope: "store-period",
    requires: ["completeCogs", "approvedExpenses"],
  },
  averageOrderValue: {
    label: "Average Order Value",
    definition: "Net revenue divided by completed sale invoice count; zero when no orders exist.",
    source: "Canonical financial event aggregation",
    scope: "store-period",
    requires: ["itemizedReturns"],
  },
  collections: {
    label: "Collections",
    definition:
      "Positive customer payment movements received in the period. Receivable collections are cash movement, not new revenue.",
    source: "Positive SalePayment.amount",
    scope: "store-period",
    requires: ["paymentLedger"],
  },
  refundsPaid: {
    label: "Refunds Paid",
    definition:
      "Absolute value of negative customer payment movements actually paid in the period.",
    source: "Negative SalePayment.amount linked to RefundSettlement",
    scope: "store-period",
    requires: ["paymentLedger"],
  },
  refundLiability: {
    label: "Outstanding Refund Liability",
    definition: "Refund obligations not yet settled; liability amount minus settled amount.",
    source: "RefundLiability.outstandingAmount in PENDING/PARTIAL status",
    scope: "store-current",
    requires: ["refundLedger"],
  },
  customers: {
    label: "Customers",
    definition:
      "Distinct persisted customer records linked to store activity; anonymous walk-ins are excluded.",
    source: "Customer links on Sale, ReturnTransaction, and CustomerVisit",
    scope: "store-period",
    requires: ["customerLinks"],
  },
  inventoryValue: {
    label: "Current Inventory Value",
    definition: "Sum of max(0, current on-hand quantity) multiplied by current product cost.",
    source: "StockEntry and Product.costPrice",
    scope: "store-current",
    requires: ["validCurrentStock", "productCost"],
  },
  inventoryRetailValue: {
    label: "Inventory Retail Value",
    definition:
      "Sum of max(0, current on-hand quantity) multiplied by current selling price, once per variant.",
    source: "StockEntry and Product selling price",
    scope: "store-current",
    requires: ["validCurrentStock"],
  },
  stockOnHand: {
    label: "Stock on Hand",
    definition: "Sum of max(0, current quantity) across product-size-store variants.",
    source: "StockEntry.quantity",
    scope: "store-current",
    requires: ["validCurrentStock"],
  },
  demandFulfilment: {
    label: "Demand Fulfilment",
    definition: "Fulfilled observed demand quantity divided by total observed demand quantity.",
    source: "DemandRequest evidence",
    scope: "store-period",
    requires: ["observedDemandEvidence"],
  },
  receivables: {
    label: "Receivables",
    definition: "Outstanding amount due on non-refunded partial-payment sales.",
    source: "Sale.amountDue and payment status",
    scope: "store-current",
    requires: ["paymentLedger"],
  },
  purchasesReceived: {
    label: "Purchases Received",
    definition: "Accepted purchase receipt value at immutable receipt or order unit cost.",
    source: "PurchaseOrderReceiptItem",
    scope: "store-period",
    requires: ["receiptCosts"],
  },
  supplierPayables: {
    label: "Supplier Payables",
    definition: "Posted supplier invoice amount less allocations and supplier payments.",
    source: "SupplierInvoice outstanding balance",
    scope: "store-current",
    requires: ["supplierLedger"],
  },
} as const satisfies Record<string, MetricDefinition>;

export type CanonicalMetric = keyof typeof metricRegistry;
