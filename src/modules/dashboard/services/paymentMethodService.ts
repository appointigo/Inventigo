import dayjs from "dayjs";
import type { SaleSummary } from "@/modules/billing/types";

export interface PaymentMethodDistribution {
  name: string;
  value: number;
  percentage: number;
}

export type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

function getCollectedPaymentEntries(sale: SaleSummary): Array<{ method: string; amount: number }> {
  const explicitEntries = (sale.payments ?? [])
    .filter((entry) => Number(entry.amount ?? 0) > 0)
    .map((entry) => ({
      method: entry.method,
      amount: Number(entry.amount ?? 0),
    }));

  if (explicitEntries.length > 0) {
    return explicitEntries;
  }

  const collectedAmount = Number(sale.amountPaid ?? 0);
  if (collectedAmount <= 0) {
    return [];
  }

  if (sale.paymentMethod === "SPLIT") {
    return [{ method: "SPLIT", amount: collectedAmount }];
  }

  if (sale.paymentMethod === "CASH" || sale.paymentMethod === "CARD" || sale.paymentMethod === "UPI") {
    return [{ method: sale.paymentMethod, amount: collectedAmount }];
  }

  return [];
}

/**
 * Filter sales by time period
 */
function filterSalesByPeriod(
  sales: SaleSummary[],
  period: TimePeriod
): SaleSummary[] {
  const now = dayjs();

  return sales.filter((sale) => {
    const saleDate = dayjs(sale.transactionDate ?? sale.createdAt);
    if (!saleDate.isValid()) return false;

    switch (period) {
      case "daily":
        return saleDate.isSame(now, "day");
      case "weekly":
        return saleDate.isSame(now, "week");
      case "monthly":
        return saleDate.isSame(now, "month");
      case "yearly":
        return saleDate.isSame(now, "year");
      default:
        return false;
    }
  });
}

/**
 * Transforms sales data into payment method distribution
 * Filters for COMPLETED sales only and aggregates by payment method
 * Optionally filters by time period
 */
export function calculatePaymentMethodDistribution(
  sales: SaleSummary[],
  period?: TimePeriod
): PaymentMethodDistribution[] {
  // Filter by period if provided
  const filteredSales = period ? filterSalesByPeriod(sales, period) : sales;

  if (filteredSales.length === 0) {
    return [];
  }

  // Aggregate by payment method. Prefer payment entries (split-aware),
  // and fall back to amountPaid/paymentMethod for legacy records with collected money.
  const methodTotals: Record<string, number> = {};
  const validMethods = ["CASH", "CARD", "UPI", "SPLIT"];

  filteredSales.forEach((sale) => {
    const paymentEntries = getCollectedPaymentEntries(sale);
    if (paymentEntries.length === 0) {
      return;
    }

    paymentEntries.forEach((entry) => {
      if (validMethods.includes(entry.method)) {
        methodTotals[entry.method] = (methodTotals[entry.method] ?? 0) + entry.amount;
      }
    });
  });

  // Calculate overall total
  const overallTotal = Object.values(methodTotals).reduce((sum, val) => sum + val, 0);

  if (overallTotal === 0) {
    return [];
  }

  // Map to display format with percentages
  const methodLabels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
    SPLIT: "Split",
  };

  return Object.entries(methodTotals)
    .map(([method, total]) => ({
      name: methodLabels[method] ?? method,
      value: Number(total.toFixed(2)),
      percentage: Number(((total / overallTotal) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Get collected revenue from sales.
 */
export function getCollectedRevenueBySales(
  sales: SaleSummary[],
  period?: TimePeriod
): number {
  const filteredSales = period ? filterSalesByPeriod(sales, period) : sales;

  return filteredSales.reduce((sum, sale) => {
    const paymentEntries = getCollectedPaymentEntries(sale);
    if (paymentEntries.length > 0) {
      return sum + paymentEntries.reduce((entrySum, entry) => entrySum + entry.amount, 0);
    }

    return sum + Math.max(0, Number(sale.amountPaid ?? 0));
  }, 0);
}

/**
 * Backward-compatible alias used by older dashboard code.
 */
export function getTotalRevenueByMethod(
  sales: SaleSummary[],
  period?: TimePeriod
): number {
  return getCollectedRevenueBySales(sales, period);
}

export function getCollectedAmountForSale(sale: SaleSummary): number {
  return getCollectedRevenueBySales([sale]);
}
