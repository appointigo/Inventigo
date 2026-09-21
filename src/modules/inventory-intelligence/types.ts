export type InventoryPeriodPreset =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "halfYearly"
  | "annual"
  | "custom";

export type InventoryComparisonMode = "previousPeriod" | "previousYear";
export type AnalyticsGranularity = "day" | "week" | "month";

export type AnalyticsWindow = { start: string; end: string; label: string };
export type AnalyticsPeriod = {
  current: AnalyticsWindow;
  comparison: AnalyticsWindow;
  granularity: AnalyticsGranularity;
  preset: InventoryPeriodPreset;
  comparisonMode: InventoryComparisonMode;
};

export type ChangeMetric = {
  absolute: number;
  percentage: number | null;
  state: "increase" | "decrease" | "unchanged" | "new" | "notApplicable";
};

export type ComparableMetric = {
  current: number | null;
  comparison: number | null;
  change: ChangeMetric;
  state?: "available" | "noSales" | "unavailable";
  note?: string;
};

export type InventoryDiagnostic = {
  classification:
    | "Possible inventory constraint"
    | "Possible demand weakness"
    | "Overstock risk"
    | "Strong demand / replenishment risk"
    | "Healthy"
    | "Insufficient evidence";
  strength: "strong" | "moderate" | "limited";
  summary: string;
  signals: string[];
};

export type DiagnosticEvidenceGroup = {
  key: "inventory" | "demand" | "lostDemand" | "pricing" | "productMix";
  title: string;
  state: "available" | "unavailable";
  signals: string[];
  note?: string;
};

export type InventoryTrendPoint = {
  key: string;
  label: string;
  salesActual: number;
  inventoryActual: number | null;
  salesIndex: number | null;
  inventoryIndex: number | null;
};

export type CategoryPerformanceRow = {
  categoryId: string;
  category: string;
  revenue: number;
  comparisonRevenue: number;
  unitsSold: number;
  comparisonUnitsSold: number;
  salesChange: ChangeMetric;
  averageStock: number | null;
  comparisonAverageStock: number | null;
  stockChange: ChangeMetric;
  currentStock: number;
  inventoryValue: number;
  sellThrough: number | null;
  stockoutDays: number | null;
  stockCoverDays: number | null;
  grossMargin: number | null;
  diagnostic: InventoryDiagnostic;
};

export type ProductSignalRow = {
  productId: string;
  product: string;
  sku: string;
  categoryId: string;
  category: string;
  brandId: string;
  brand: string;
  unitsSold: number;
  currentStock: number;
  inventoryValue: number;
  sellThrough: number | null;
  stockCoverDays: number | null;
  stockoutDays: number | null;
  daysSinceSale: number | null;
  priorityScore: number;
  status:
    | "Critical"
    | "Reorder soon"
    | "Monitor"
    | "Healthy"
    | "Overstock risk"
    | "Slow moving"
    | "Dead stock candidate";
};

export type SizeInsightRow = {
  sizeId: string;
  size: string;
  unitsSold: number;
  demandShare: number;
  currentStock: number;
  stockoutDays: number | null;
  sellThrough: number | null;
  availability: number | null;
  status: "Healthy" | "Low" | "Critical" | "Out of stock" | "Low demand";
};

export type InventoryDrilldownRow = {
  categoryId: string;
  category: string;
  brandId: string;
  brand: string;
  productId: string;
  product: string;
  sku: string;
  sizeId: string;
  size: string;
  revenue: number;
  comparisonRevenue: number;
  revenueChange: ChangeMetric;
  unitsSold: number;
  comparisonUnitsSold: number;
  grossMargin: number | null;
  averageStock: number | null;
  comparisonAverageStock: number | null;
  stockChange: ChangeMetric;
  currentStock: number;
  inventoryValue: number;
  sellThrough: number | null;
  stockCoverDays: number | null;
  stockoutDays: number | null;
};

export type InactivityBucket = {
  label: "0–30 days" | "31–60 days" | "61–90 days" | "91–180 days" | "180+ days" | "Never sold";
  units: number;
  costValue: number;
  percentage: number;
};

export type InventoryIntelligenceResponse = {
  range: AnalyticsPeriod;
  generatedAt: string;
  methodology: {
    revenue: string;
    inventoryValue: string;
    sellThrough: string;
    stockCover: string;
    stockHistoryReliable: boolean;
    stockHistoryNote: string | null;
    grossMarginReliable: boolean;
    lostDemandAvailable: false;
  };
  kpis: {
    revenue: ComparableMetric;
    unitsSold: ComparableMetric;
    grossMargin: ComparableMetric;
    grossMarginPercent: ComparableMetric;
    inventoryValue: ComparableMetric;
    sellThrough: ComparableMetric;
    stockCover: ComparableMetric;
    averageRealizedPrice: ComparableMetric;
  };
  trend: InventoryTrendPoint[];
  correlation: { coefficient: number; observationCount: number; description: string } | null;
  categoryPerformance: CategoryPerformanceRow[];
  drilldown: InventoryDrilldownRow[];
  highDemandLowStock: ProductSignalRow[];
  overstock: ProductSignalRow[];
  sizeInsights: SizeInsightRow[];
  sizeAvailabilityScore: number | null;
  inactivity: InactivityBucket[];
  replenishment: ProductSignalRow[];
  diagnostics: InventoryDiagnostic;
  diagnosticEvidence: DiagnosticEvidenceGroup[];
  lostDemand: null;
};
