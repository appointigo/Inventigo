export const REPLENISHMENT_POLICY = {
  fallbackLeadTimeDays: 14,
  safetyBufferDays: 5,
  targetCoverDays: 30,
  minimumActiveDaysForQuantity: 7,
  highEvidenceActiveDays: 30,
  mediumEvidenceActiveDays: 14,
  highEvidenceLeadSamples: 3,
  overstockCoverDays: 120,
  extremeOverstockCoverDays: 180,
  markdownInactivityDays: 60,
  markdownMarginFloorPercent: 30,
  markdownMinimumInventoryValue: 5_000,
  meaningfulDemandRequests: 3,
} as const;

export type RecommendationType =
  | "REORDER"
  | "NO_REORDER"
  | "STOCKOUT_RISK"
  | "INBOUND_COVERS_DEMAND"
  | "OVERSTOCK"
  | "MARKDOWN_CANDIDATE"
  | "MONITOR";
export type EvidenceQuality = "HIGH" | "MEDIUM" | "LOW";
export type LeadTimeSource = "SUPPLIER_PRODUCT" | "SUPPLIER" | "FALLBACK";
export type InboundEvidence = {
  quantity: number;
  expectedInDays: number | null;
  expectedDate: string | null;
  overdue: boolean;
};
export type ReplenishmentInput = {
  productId: string;
  sizeId: string;
  active: boolean;
  currentStock: number;
  unitCost: number;
  netUnitsSold: number;
  activeTradingDays: number;
  observationDays: number;
  unfulfilledDemand: number;
  leadTimeDays: number;
  leadTimeSource: LeadTimeSource;
  leadTimeSamples: number;
  inbound: InboundEvidence[];
  daysSinceSale: number | null;
  productAgeDays: number;
  grossMarginPercent: number | null;
  returnRate: number;
  stockHistoryReliable: boolean;
  asOfDate: string;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const ceil = (value: number) => Math.max(0, Math.ceil(value));

export function evidenceQuality(input: ReplenishmentInput): EvidenceQuality {
  if (
    !input.stockHistoryReliable ||
    input.activeTradingDays < REPLENISHMENT_POLICY.minimumActiveDaysForQuantity
  )
    return "LOW";
  if (
    input.activeTradingDays >= REPLENISHMENT_POLICY.highEvidenceActiveDays &&
    input.leadTimeSamples >= REPLENISHMENT_POLICY.highEvidenceLeadSamples &&
    input.leadTimeSource !== "FALLBACK"
  )
    return "HIGH";
  if (
    input.activeTradingDays >= REPLENISHMENT_POLICY.mediumEvidenceActiveDays &&
    input.leadTimeSource !== "FALLBACK"
  )
    return "MEDIUM";
  return "LOW";
}

export function calculateReplenishment(input: ReplenishmentInput) {
  const velocity =
    input.activeTradingDays > 0 ? Math.max(0, input.netUnitsSold) / input.activeTradingDays : 0;
  const leadTimeDemand = ceil(velocity * input.leadTimeDays);
  const demandPressureBuffer = ceil(input.unfulfilledDemand * 0.25);
  const safetyStock = ceil(velocity * REPLENISHMENT_POLICY.safetyBufferDays) + demandPressureBuffer;
  const reorderPoint = leadTimeDemand + safetyStock;
  const targetStock = ceil(velocity * REPLENISHMENT_POLICY.targetCoverDays) + safetyStock;
  const coverDays = velocity > 0 ? round(input.currentStock / velocity, 1) : null;
  const estimatedStockoutInDays =
    velocity > 0 ? Math.max(0, Math.floor(input.currentStock / velocity)) : null;
  const estimatedStockoutDate =
    estimatedStockoutInDays === null
      ? null
      : new Date(
          new Date(`${input.asOfDate}T00:00:00.000Z`).getTime() +
            estimatedStockoutInDays * 86_400_000
        )
          .toISOString()
          .slice(0, 10);
  const usefulInbound = input.inbound
    .filter(
      (row) =>
        !row.overdue &&
        row.expectedInDays !== null &&
        (estimatedStockoutInDays === null
          ? row.expectedInDays <= input.leadTimeDays
          : row.expectedInDays <= estimatedStockoutInDays)
    )
    .reduce((sum, row) => sum + row.quantity, 0);
  const totalInbound = input.inbound.reduce((sum, row) => sum + row.quantity, 0);
  const lateInbound = input.inbound
    .filter(
      (row) =>
        row.overdue ||
        (row.expectedInDays !== null &&
          estimatedStockoutInDays !== null &&
          row.expectedInDays > estimatedStockoutInDays)
    )
    .reduce((sum, row) => sum + row.quantity, 0);
  const quality = evidenceQuality(input);
  const recommendedQuantity =
    quality === "LOW" ? null : ceil(targetStock - input.currentStock - usefulInbound);
  const excessUnits = Math.max(0, input.currentStock - targetStock);
  const excessInventoryValue = round(excessUnits * input.unitCost);
  const inventoryValue = round(Math.max(0, input.currentStock) * input.unitCost);
  const reasons: string[] = [];
  const reasonCodes: string[] = [];
  let type: RecommendationType = "MONITOR";
  let severity = "LOW";

  if (!input.active) {
    type = "NO_REORDER";
    severity = "LOW";
    reasonCodes.push("PRODUCT_INACTIVE");
    reasons.push("Product is inactive");
  } else if ((input.daysSinceSale ?? 0) >= 180 && input.currentStock > 0) {
    type = "NO_REORDER";
    severity = "HIGH";
    reasonCodes.push("DEAD_STOCK");
    reasons.push(
      `No sale for ${input.daysSinceSale} days`,
      `${input.currentStock} units remain in stock`
    );
  } else if ((coverDays ?? 0) >= REPLENISHMENT_POLICY.extremeOverstockCoverDays) {
    type = "NO_REORDER";
    severity = "HIGH";
    reasonCodes.push("EXTREME_OVERSTOCK");
    reasons.push(`${coverDays} days of stock cover`, `${excessUnits} estimated excess units`);
  } else if (
    excessUnits > 0 &&
    ((coverDays ?? 0) >= REPLENISHMENT_POLICY.overstockCoverDays ||
      (input.daysSinceSale ?? 0) >= REPLENISHMENT_POLICY.markdownInactivityDays)
  ) {
    const markdownSafe =
      input.grossMarginPercent !== null &&
      input.grossMarginPercent >= REPLENISHMENT_POLICY.markdownMarginFloorPercent &&
      inventoryValue >= REPLENISHMENT_POLICY.markdownMinimumInventoryValue &&
      input.unfulfilledDemand < REPLENISHMENT_POLICY.meaningfulDemandRequests &&
      input.productAgeDays >= 30;
    type = markdownSafe ? "MARKDOWN_CANDIDATE" : "OVERSTOCK";
    severity = "MEDIUM";
    reasonCodes.push(
      markdownSafe
        ? "MARKDOWN_HEADROOM"
        : input.grossMarginPercent === null
          ? "MISSING_COST"
          : "EXCESS_INVENTORY"
    );
    reasons.push(
      `${excessUnits} estimated excess units`,
      `${round(excessInventoryValue)} estimated excess inventory value`,
      input.grossMarginPercent === null
        ? "Margin headroom unavailable"
        : `${input.grossMarginPercent}% gross margin`
    );
  } else if (
    quality === "LOW" &&
    velocity <= 0 &&
    input.unfulfilledDemand < REPLENISHMENT_POLICY.meaningfulDemandRequests
  ) {
    type = "MONITOR";
    severity = "LOW";
    reasonCodes.push("INSUFFICIENT_SALES_HISTORY");
    reasons.push("Not enough evidence for a reliable reorder quantity");
  } else if (
    estimatedStockoutInDays !== null &&
    lateInbound > 0 &&
    estimatedStockoutInDays < input.leadTimeDays
  ) {
    type = "STOCKOUT_RISK";
    severity = estimatedStockoutInDays <= 3 ? "CRITICAL" : "HIGH";
    reasonCodes.push("INBOUND_ARRIVES_LATE");
    reasons.push(
      `Estimated stockout in ${estimatedStockoutInDays} days`,
      `${lateInbound} inbound units are expected too late`
    );
  } else if (
    input.currentStock <= reorderPoint &&
    usefulInbound > 0 &&
    input.currentStock + usefulInbound >= reorderPoint
  ) {
    type = "INBOUND_COVERS_DEMAND";
    severity = "LOW";
    reasonCodes.push("TIMELY_INBOUND");
    reasons.push(
      `${usefulInbound} timely inbound units cover the ${reorderPoint}-unit reorder point`
    );
  } else if (
    input.currentStock <= reorderPoint ||
    input.unfulfilledDemand >= REPLENISHMENT_POLICY.meaningfulDemandRequests
  ) {
    if (quality === "LOW") {
      type = "MONITOR";
      severity = "MEDIUM";
      reasonCodes.push(
        "LOW_EVIDENCE",
        ...(input.unfulfilledDemand >= REPLENISHMENT_POLICY.meaningfulDemandRequests
          ? ["DEMAND_PRESSURE"]
          : [])
      );
      reasons.push(
        "Demand or stock pressure exists, but evidence is insufficient for a precise quantity"
      );
    } else {
      type = "REORDER";
      severity = input.currentStock <= 0 ? "CRITICAL" : "HIGH";
      reasonCodes.push(
        "BELOW_REORDER_POINT",
        ...(input.unfulfilledDemand >= REPLENISHMENT_POLICY.meaningfulDemandRequests
          ? ["DEMAND_PRESSURE"]
          : [])
      );
      reasons.push(
        `${input.currentStock} current units versus ${reorderPoint}-unit reorder point`,
        `${recommendedQuantity} units to reach ${targetStock}-unit target`
      );
    }
  } else if (coverDays !== null && coverDays <= input.leadTimeDays) {
    type = "STOCKOUT_RISK";
    severity = coverDays <= 3 ? "CRITICAL" : "HIGH";
    reasonCodes.push("COVER_BELOW_LEAD_TIME");
    reasons.push(`${coverDays} days cover versus ${input.leadTimeDays}-day lead time`);
  } else {
    type = "NO_REORDER";
    severity = "LOW";
    reasonCodes.push("STOCK_SUFFICIENT");
    reasons.push(`${coverDays ?? "Unknown"} days of cover`, `${totalInbound} units inbound`);
  }

  if (input.leadTimeSource === "FALLBACK") {
    reasonCodes.push("MISSING_LEAD_TIME");
    reasons.push(`Using ${input.leadTimeDays}-day configured lead-time fallback`);
  }
  if (!input.stockHistoryReliable) reasonCodes.push("UNRELIABLE_STOCK_HISTORY");
  return {
    type,
    severity,
    recommendedQuantity: type === "REORDER" ? recommendedQuantity : null,
    reasons,
    reasonCodes: [...new Set(reasonCodes)],
    evidenceQuality: quality,
    evidence: {
      stock: input.currentStock,
      velocity: round(velocity, 3),
      activeTradingDays: input.activeTradingDays,
      observationDays: input.observationDays,
      netUnitsSold: input.netUnitsSold,
      leadTimeDays: input.leadTimeDays,
      leadTimeSource: input.leadTimeSource,
      leadTimeSamples: input.leadTimeSamples,
      safetyBufferDays: REPLENISHMENT_POLICY.safetyBufferDays,
      safetyStock,
      demandPressureBuffer,
      unfulfilledDemand: input.unfulfilledDemand,
      reorderPoint,
      targetStock,
      coverDays,
      estimatedStockoutInDays,
      estimatedStockoutDate,
      totalInbound,
      usefulInbound,
      lateInbound,
      excessUnits,
      inventoryValue,
      unitCost: input.unitCost,
      excessInventoryValue,
      grossMarginPercent: input.grossMarginPercent,
    },
  };
}

export function evaluateRecommendationOutcome(input: {
  minimumStock: number;
  poQuantity: number;
  endingStock: number;
  targetStock: number;
}) {
  return {
    stockoutOccurred: input.minimumStock <= 0,
    orderPlaced: input.poQuantity > 0,
    quantityOrdered: input.poQuantity,
    excessiveEndingStock: input.endingStock > input.targetStock * 1.5,
  };
}
