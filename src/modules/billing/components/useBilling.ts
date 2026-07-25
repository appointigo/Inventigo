"use client";

import { useState, useCallback, useEffect } from "react";
import type { SaleFilters, SaleSummary } from "../types";

export const useSales = (initialFilters: SaleFilters = {}, initialPage = 1, initialLimit = 20) => {
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SaleFilters>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [version, setVersion] = useState(0);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const currentVersion = version;

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      // Only append filters that have a defined, non-empty value
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });

      const res = await fetch(`/api/billing/sales?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        // Log the server error for better debugging
        const errorPayload = await res.text();
        console.error("Failed to fetch sales:", res.status, errorPayload);
        throw new Error(`Failed to fetch sales (status: ${res.status})`);
      }

      const payload = await res.json().catch(() => null);

      // Ignore stale responses that raced with a newer request.
      if (version !== currentVersion || !payload) {
        return;
      }

      setSales(payload.data ?? []);
      setTotalPages(payload.pagination?.totalPages ?? 1);
      setStats(payload.stats ?? null);
    } catch (error) {
      console.error(error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, version]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const refresh = () => {
    setVersion((v) => v + 1);
  };

  return {
    sales,
    loading,
    filters,
    setFilters,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    stats,
    refresh,
  };
};

// Assuming useCart is in the same file or another file.
// For now, just adding a placeholder so other files don't break.
export const useCart = () => {
  return {
    items: [],
    subtotal: 0,
    taxPct: 0,
    discountPct: 0,
    paymentMethod: "CASH",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    transactionDate: new Date().toISOString(),
    splitMode: false,
    splitPayments: [],
    amountPaid: 0,
    amountDue: 0,
    isAmountPaidManual: false,
    addItem: () => {},
    removeItem: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
    setTaxPct: () => {},
    setDiscountPct: () => {},
    setPromoCodeId: () => {},
    setPaymentMethod: () => {},
    setCustomerName: () => {},
    setCustomerPhone: () => {},
    setCustomerEmail: () => {},
    setTransactionDate: () => {},
    setSplitMode: () => {},
    setSplitPayments: () => {},
    setAmountPaid: () => {},
    setIsAmountPaidManual: () => {},
    setDiscountMode: () => {},
    toCreateInput: () => ({ items: [] }),
  };
};