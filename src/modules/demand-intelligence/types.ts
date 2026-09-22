export type VisitOutcome = "CONVERTED" | "NOT_CONVERTED" | "PARTIALLY_CONVERTED" | "BROWSING";
export type DemandRequestStatus = "FULFILLED" | "PARTIALLY_FULFILLED" | "UNFULFILLED" | "ABANDONED";
export type DemandReasonCode =
  | "OUT_OF_STOCK"
  | "VARIANT_UNAVAILABLE"
  | "PRODUCT_UNAVAILABLE"
  | "BRAND_UNAVAILABLE"
  | "FEATURE_UNAVAILABLE"
  | "PRICE_TOO_HIGH"
  | "COLOR_UNAVAILABLE"
  | "SIZE_UNAVAILABLE"
  | "CUSTOMER_CHANGED_MIND"
  | "JUST_BROWSING"
  | "OTHER";

export type DemandRequestInput = {
  categoryId?: string;
  brandId?: string;
  productId?: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  status: DemandRequestStatus;
  reasonCode: DemandReasonCode;
  attributes?: Record<string, string | number | boolean | string[]>;
  notes?: string;
};

export type CustomerVisitInput = {
  storeId: string;
  visitedAt?: string;
  outcome: VisitOutcome;
  linkedSaleId?: string;
  source?: string;
  notes?: string;
  idempotencyKey?: string;
  requests: DemandRequestInput[];
};

export type DemandRequirementRow = {
  key: string;
  requirement: string;
  categoryId: string | null;
  productId: string | null;
  observedDemand: number;
  fulfilled: number;
  unfulfilled: number;
  currentStock: number;
  fulfillmentRate: number | null;
  signal: DemandPressureSignal;
};

export type DemandPressureSignal =
  | "Critical Demand Gap"
  | "Replenishment Needed"
  | "Healthy"
  | "Low Demand"
  | "Overstock Risk"
  | "Early signal"
  | "Insufficient demand data";

export type DemandCategoryRow = {
  categoryId: string;
  category: string;
  sales: number;
  observedDemand: number;
  unfulfilledDemand: number;
  fulfillmentRate: number | null;
  currentStock: number;
  signal: DemandPressureSignal;
};

export type DemandAttributeRow = {
  attribute: string;
  value: string;
  observedDemand: number;
  unfulfilledDemand: number;
  observedDemandShare: number;
};

export type DemandAnalyticsResponse = {
  generatedAt: string;
  range: { start: string; end: string };
  evidence: "none" | "early" | "reliable";
  evidenceNote: string;
  visits: {
    total: number;
    converted: number;
    partiallyConverted: number;
    nonConverted: number;
    browsing: number;
    conversionRate: number | null;
  };
  demand: {
    totalRequests: number;
    fulfilledRequests: number;
    partiallyFulfilledRequests: number;
    unfulfilledRequests: number;
    observedDemand: number;
    fulfilledQuantity: number;
    unfulfilledQuantity: number;
    fulfillmentRate: number | null;
  };
  reasons: Array<{ reasonCode: DemandReasonCode; label: string; count: number; share: number }>;
  requirements: DemandRequirementRow[];
  categories: DemandCategoryRow[];
  attributes: DemandAttributeRow[];
};

export const DEMAND_REASON_LABELS: Record<DemandReasonCode, string> = {
  OUT_OF_STOCK: "Out of stock",
  VARIANT_UNAVAILABLE: "Variant unavailable",
  PRODUCT_UNAVAILABLE: "Product unavailable",
  BRAND_UNAVAILABLE: "Brand unavailable",
  FEATURE_UNAVAILABLE: "Feature unavailable",
  PRICE_TOO_HIGH: "Price too high",
  COLOR_UNAVAILABLE: "Colour unavailable",
  SIZE_UNAVAILABLE: "Size unavailable",
  CUSTOMER_CHANGED_MIND: "Customer changed mind",
  JUST_BROWSING: "Just browsing",
  OTHER: "Other",
};
