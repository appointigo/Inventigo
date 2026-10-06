import type { DecisionInsight } from "@/modules/decision-intelligence/types";
import type { ProductDecisionType } from "./productDecisionRules";

export type ProductIntelligenceRow = {
  productId: string;
  product: string;
  sku: string;
  categoryId: string;
  category: string;
  brandId: string;
  brand: string;
  isActive: boolean;
  revenue: number;
  unitsSold: number;
  orders: number;
  averageSellingPrice: number | null;
  cogs: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  currentQuantity: number;
  inboundQuantity: number;
  inboundExpectedDate: string | null;
  inboundOverdue: boolean;
  inventoryValue: number;
  salesVelocityPerDay: number;
  stockCoverDays: number | null;
  sellThrough: number | null;
  lastSaleDate: string | null;
  lowStock: boolean;
  slowMoving: boolean;
  deadStock: boolean;
  overstock: boolean;
  observedDemand: number | null;
  fulfilledDemand: number | null;
  unfulfilledDemand: number | null;
  returnRate: number;
  discountRate: number;
  marginLostToReturns: number | null;
  discountAmount: number;
  completeness: { cogs: "COMPLETE" | "UNAVAILABLE"; reasons: string[] };
  decision: DecisionInsight<ProductDecisionType>;
};

export type ProductIntelligenceResponse = {
  generatedAt: string;
  scope: { type: "STORE"; storeId: string; storeName: string };
  range: { start: string; end: string; label: string };
  pointInTimeAt: string;
  items: ProductIntelligenceRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    reorder: number;
    demandGap: number;
    slowMoving: number;
    deadStock: number;
    overstock: number;
    highReturn: number;
    inboundStock: number;
  };
  filters: {
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  };
};
