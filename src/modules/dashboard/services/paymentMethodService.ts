import dayjs from "dayjs";
import type { SaleSummary } from "@/modules/billing/types";

export interface PaymentMethodDistribution {
  name: string;
  value: number;
  percentage: number;
}

export type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

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
  let filteredSales = period ? filterSalesByPeriod(sales, period) : sales;

  // Filter only completed sales
  const completedSales = filteredSales.filter((sale) => sale.status === "COMPLETED");

  if (completedSales.length === 0) {
    return [];
  }

  // Aggregate by payment method. Prefer payment entries (split-aware),
  // and fall back to sale.paymentMethod for legacy records (only valid methods).
  const methodTotals: Record<string, number> = {};
  const validMethods = ["CASH", "CARD", "UPI"];

  completedSales.forEach((sale) => {
    const paymentEntries = (sale.payments ?? [])
      .filter((entry) => Number(entry.amount ?? 0) > 0)
      .map((entry) => ({
        method: entry.method,
        amount: Number(entry.amount ?? 0),
      }));

    if (paymentEntries.length > 0) {
      // Use individual payment entries (split payment breakdown)
      paymentEntries.forEach((entry) => {
        if (validMethods.includes(entry.method)) {
          methodTotals[entry.method] = (methodTotals[entry.method] ?? 0) + entry.amount;
        }
      });
      return;
    }

    // Fallback to sale.paymentMethod only for legacy records with valid methods
    const fallbackMethod = sale.paymentMethod;
    if (validMethods.includes(fallbackMethod)) {
      const fallbackAmount = Number(sale.total) || 0;
      methodTotals[fallbackMethod] = (methodTotals[fallbackMethod] ?? 0) + fallbackAmount;
    }
    // If method is "SPLIT" without payment entries, skip (data issue or in-progress)
  });

  // Calculate overall total
  const overallTotal = Object.values(methodTotals).reduce((sum, val) => sum + val, 0);

  if (overallTotal === 0) {
    return [];
  }

  // Map to display format with percentages
  // Note: SPLIT should never appear here - it's not a reportable payment method
  const methodLabels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
  };

  return Object.entries(methodTotals)
    .map(([method, total]) => ({
      name: methodLabels[method] ?? method,
      value: Number(total.toFixed(2)), // Ensure 2 decimal precision
      percentage: Number(((total / overallTotal) * 100).toFixed(2)), // Round to 2 decimals
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending
}

/**
 * Get total revenue by payment method
 */
export function getTotalRevenueByMethod(
  sales: SaleSummary[],
  period?: TimePeriod
): number {
  // Filter by period if provided
  let filteredSales = period ? filterSalesByPeriod(sales, period) : sales;
  
  const completedSales = filteredSales.filter((sale) => sale.status === "COMPLETED");
  return completedSales.reduce((sum, sale) => {
    const hasPayments = Array.isArray(sale.payments) && sale.payments.length > 0;
    if (!hasPayments) return sum + Number(sale.total || 0);

    const paid = (sale.payments ?? []).reduce((entrySum, entry) => {
      const amount = Number(entry.amount ?? 0);
      return amount > 0 ? entrySum + amount : entrySum;
    }, 0);

    return sum + paid;
  }, 0);
}
