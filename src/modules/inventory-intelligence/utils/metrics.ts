import type { ChangeMetric, InventoryDiagnostic } from "../types";

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export type AnalyticsTransactionEvent = {
  revenue: number;
  units: number;
  cost: number | null;
};

export function summarizeTransactionEvents(events: AnalyticsTransactionEvent[]) {
  const revenue = round(events.reduce((sum, event) => sum + event.revenue, 0));
  const units = events.reduce((sum, event) => sum + event.units, 0);
  const costComplete = events.every((event) => event.cost !== null);
  const cogs = round(events.reduce((sum, event) => sum + (event.cost ?? 0), 0));
  return {
    revenue,
    units,
    cogs,
    costComplete,
    grossMargin: costComplete ? round(revenue - cogs) : null,
    averageRealizedPrice: units > 0 ? round(revenue / units) : null,
  };
}

export function calculateInventoryValue(positions: Array<{ quantity: number; unitCost: number }>) {
  return round(
    positions.reduce((sum, position) => sum + Math.max(0, position.quantity) * position.unitCost, 0)
  );
}

export function resolveMovementDelta(
  type: "IN" | "OUT" | "SALE" | "RETURN" | "ADJUSTMENT",
  quantity: number
) {
  if (type === "IN" || type === "RETURN") return Math.abs(quantity);
  if (type === "OUT" || type === "SALE") return -Math.abs(quantity);
  return null;
}

export const calculateStockoutDays = (dailyStock: number[] | null) =>
  dailyStock === null ? null : dailyStock.filter((quantity) => quantity <= 0).length;

export function reconstructStockSnapshot(
  current: Map<string, number>,
  movements: Array<{
    key: string;
    type: "IN" | "OUT" | "SALE" | "RETURN" | "ADJUSTMENT";
    quantity: number;
    date: Date;
  }>,
  at: Date
) {
  const snapshot = new Map(current);
  for (const movement of movements) {
    if (movement.date < at) continue;
    const delta = resolveMovementDelta(movement.type, movement.quantity);
    if (delta === null) return null;
    snapshot.set(movement.key, (snapshot.get(movement.key) ?? 0) - delta);
  }
  return snapshot;
}

export function calculateChange(current: number | null, comparison: number | null): ChangeMetric {
  if (current === null || comparison === null) {
    return { absolute: 0, percentage: null, state: "notApplicable" };
  }
  const absolute = round(current - comparison);
  if (comparison === 0) {
    return {
      absolute,
      percentage: current === 0 ? 0 : null,
      state: current === 0 ? "unchanged" : "new",
    };
  }
  const percentage = round((absolute / Math.abs(comparison)) * 100, 1);
  return {
    absolute,
    percentage,
    state: absolute > 0 ? "increase" : absolute < 0 ? "decrease" : "unchanged",
  };
}

export const calculateSellThrough = (
  netUnits: number,
  openingStock: number,
  inboundUnits: number
) => {
  const available = Math.max(0, openingStock) + Math.max(0, inboundUnits);
  return available > 0 ? round((Math.max(0, netUnits) / available) * 100, 1) : null;
};

export const calculateStockCover = (currentStock: number, netUnits: number, days: number) => {
  if (netUnits <= 0 || days <= 0) return null;
  return round(currentStock / (netUnits / days), 1);
};

export const resolveSaleLineRevenue = (
  finalLineAmount: number | null,
  netLineAmount: number | null,
  legacyTotal: number
) => {
  if ((finalLineAmount ?? 0) > 0) return finalLineAmount!;
  if ((netLineAmount ?? 0) > 0) return netLineAmount!;
  return legacyTotal;
};

export function calculateCorrelation(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 5) return null;
  const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;
  xs.forEach((x, index) => {
    const dx = x - avgX;
    const dy = ys[index] - avgY;
    numerator += dx * dy;
    xVariance += dx * dx;
    yVariance += dy * dy;
  });
  if (xVariance < 1e-9 || yVariance < 1e-9) return null;
  return round(numerator / Math.sqrt(xVariance * yVariance), 2);
}

export function classifyInventoryPerformance(input: {
  salesChangePct: number | null;
  stockChangePct: number | null;
  sellThrough: number | null;
  stockCoverDays: number | null;
  stockoutDays: number | null;
  unitsSold: number;
  unavailableDemandCount?: number;
}): InventoryDiagnostic {
  const {
    salesChangePct,
    stockChangePct,
    sellThrough,
    stockCoverDays,
    stockoutDays,
    unitsSold,
    unavailableDemandCount = 0,
  } = input;
  if (unitsSold < 3 || salesChangePct === null) {
    return {
      classification: "Insufficient evidence",
      strength: "limited",
      summary: "There is not enough sales history to classify this period reliably.",
      signals: ["Low transaction volume"],
    };
  }
  const stockouts = (stockoutDays ?? 0) >= 2;
  const highSellThrough = (sellThrough ?? 0) >= 60;
  const lowCover = stockCoverDays !== null && stockCoverDays <= 14;
  if (
    salesChangePct < -10 &&
    (stockChangePct ?? 0) < -10 &&
    (stockouts || highSellThrough || unavailableDemandCount > 0)
  ) {
    return {
      classification: "Possible inventory constraint",
      strength:
        (stockouts && highSellThrough) || unavailableDemandCount >= 3 ? "strong" : "moderate",
      summary: "Inventory availability may be contributing to the sales decline.",
      signals: [
        "Sales declined",
        "Average stock declined",
        ...(stockouts ? ["Stockout days recorded"] : []),
        ...(unavailableDemandCount > 0
          ? [`${unavailableDemandCount} unavailable-item demand signals recorded`]
          : []),
      ],
    };
  }
  if (salesChangePct < -10 && (stockChangePct ?? 0) >= 0 && !stockouts) {
    return {
      classification: "Possible demand weakness",
      strength: "moderate",
      summary:
        "Inventory remained available while sales weakened; demand, pricing and product mix merit investigation.",
      signals: ["Sales declined", "Inventory was stable or higher", "No material stockout signal"],
    };
  }
  if (salesChangePct < 0 && (stockChangePct ?? 0) > 15 && (sellThrough ?? 100) < 35) {
    return {
      classification: "Overstock risk",
      strength: "strong",
      summary: "Inventory increased while sales and sell-through weakened.",
      signals: ["Inventory increased", "Sales declined", "Sell-through is low"],
    };
  }
  if (salesChangePct > 10 && ((stockChangePct ?? 0) < 0 || lowCover) && highSellThrough) {
    return {
      classification: "Strong demand / replenishment risk",
      strength: "strong",
      summary: "Demand is strong while available inventory or cover is tightening.",
      signals: [
        "Sales increased",
        "Sell-through is high",
        ...(lowCover ? ["Stock cover is low"] : []),
      ],
    };
  }
  return {
    classification: "Healthy",
    strength: "moderate",
    summary: "Sales and inventory signals are broadly balanced for this period.",
    signals: ["No material risk threshold was crossed"],
  };
}
