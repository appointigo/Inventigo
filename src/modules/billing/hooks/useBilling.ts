"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Sale, SaleFilters, SaleSummary, CartItem, CreateSaleInput, PaymentMethodType, SplitPaymentEntry } from "../types";

export function useSales(initialFilters?: SaleFilters) {
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SaleFilters>(initialFilters ?? {});
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number }>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<any>(null);
  const activeRequestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSales = useCallback(async () => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    // Cancel any in-flight request so only the latest filter/page request wins.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
      if ((filters as any).type) params.set("type", (filters as any).type);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const qs = params.toString();
      const res = await fetch(`/api/billing/history${qs ? `?${qs}` : ""}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch sales");
      const payload = await res.json().catch(() => null);

      // Ignore stale responses that raced with a newer request.
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      if (Array.isArray(payload)) {
        setSales(payload as SaleSummary[]);
        setPagination({ page, limit, total: payload.length, totalPages: Math.max(1, Math.ceil(payload.length / limit)) });
        setStats(null);
      } else if (payload && payload.data) {
        setSales(payload.data as SaleSummary[]);
        setPagination(payload.pagination ?? { page, limit, total: (payload.data?.length ?? 0), totalPages: Math.max(1, Math.ceil((payload.data?.length ?? 0) / limit)) });
        setStats(payload.stats ?? null);
      } else {
        setSales([]);
        setPagination({ page, limit, total: 0, totalPages: 1 });
        setStats(null);
      }
    } 
    catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Failed to fetch sales:", error);
    } 
    finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, page, limit]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const createSale = async (input: CreateSaleInput): Promise<Sale> => {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to create sale" }));
      throw new Error(payload?.error || "Failed to create sale");
    }
    const sale = await res.json();
    await fetchSales();
    return sale;
  };

  const refundSale = async (saleId: string) => {
    const res = await fetch(`/api/billing/${encodeURIComponent(saleId)}/refund`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to refund sale");
    await fetchSales();
  };

  const collectPayment = async (
    saleId: string,
    amount: number,
    paymentMethod: PaymentMethodType,
    splitPayments?: Array<{ method: PaymentMethodType; amount: number }>,
    note?: string,
    businessDate?: string
  ) => {
    const res = await fetch(`/api/billing/${encodeURIComponent(saleId)}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        method: paymentMethod,
        splitPayments,
        note,
        businessDate,
      }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to collect payment" }));
      throw new Error(payload?.error || "Failed to collect payment");
    }
    await fetchSales();
  };

  const getSaleById = async (saleId: string): Promise<Sale | null> => {
    const res = await fetch(`/api/billing/${encodeURIComponent(saleId)}`);
    if (!res.ok) return null;
    return res.json();
  };

  const createReturnTransaction = async (
    saleId: string,
    payload: {
      type: "RETURN" | "EXCHANGE" | "RETURN_EXCHANGE";
      returnedItems: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      exchangedItems?: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      refundAmount: number;
      offsetAmount: number;
      refundMethod?: PaymentMethodType;
      topUpPayments?: Array<{ method: PaymentMethodType; amount: number }>;
      refundPayments?: Array<{ method: PaymentMethodType; amount: number }>;
      reason?: string;
      condition?: string;
      notes?: string;
    }
  ) => {
    const res = await fetch(`/api/billing/${encodeURIComponent(saleId)}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: "Failed to process return/exchange" }));
      throw new Error(payload?.error || "Failed to process return/exchange");
    }
    await fetchSales();
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
    pagination,
    stats,
    createSale,
    refundSale,
    collectPayment,
    getSaleById,
    createReturnTransaction,
    refresh: fetchSales,
  };
}

/** Cart state management hook */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [discountMode, setDiscountMode] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("CASH");
  const [amountPaid, setAmountPaid] = useState(0);
  const [isAmountPaidManual, setIsAmountPaidManual] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [promoCodeId, setPromoCodeId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([{ method: "CASH", amount: 0 }]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && i.sizeId === item.sizeId
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId && i.sizeId === item.sizeId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (productId: string, sizeId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.sizeId === sizeId ? { ...i, quantity } : i
      )
    );
  };

  const removeItem = (productId: string, sizeId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.sizeId === sizeId))
    );
  };

  const clearCart = () => {
    setItems([]);
    setDiscountPct(0);
    setTaxPct(0);
    setDiscountMode("PERCENTAGE");
    setPaymentMethod("CASH");
    setAmountPaid(0);
    setIsAmountPaidManual(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setPromoCodeId(null);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setSplitMode(false);
    setSplitPayments([{ method: "CASH", amount: 0 }]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const taxAmount = Math.round(subtotal * taxPct / 100);
  const total = subtotal - discountAmount + taxAmount;
  const amountDue = Math.max(total - amountPaid, 0);

  const toCreateInput = (): CreateSaleInput => {
    if (splitMode) {
      const normalizedSplitPayments = splitPayments
        .map((entry) => ({ method: entry.method, amount: Number(entry.amount || 0) }))
        .filter((entry) => entry.amount > 0);

      const splitAmountPaid = normalizedSplitPayments.reduce((sum, entry) => sum + entry.amount, 0);

      return {
        items,
        paymentMethod,
        splitPayments: normalizedSplitPayments,
        discountType: discountMode,
        discountPercent: discountPct,
        taxRate: taxPct,
        taxMode: "EXCLUSIVE",
        discountAmount,
        taxAmount,
        amountPaid: Math.max(0, splitAmountPaid),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        promoCodeId: promoCodeId ?? undefined,
        transactionDate,
      };
    }

    return {
      items,
      paymentMethod,
      discountType: discountMode,
      discountPercent: discountPct,
      taxRate: taxPct,
      taxMode: "EXCLUSIVE",
      discountAmount,
      taxAmount,
      amountPaid: Math.max(0, amountPaid),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      promoCodeId: promoCodeId ?? undefined,
      transactionDate,
    };
  };

  return {
    items,
    subtotal,
    discountPct,
    taxPct,
    discountMode,
    discountAmount,
    taxAmount,
    total,
    amountPaid,
    amountDue,
    paymentMethod,
    customerName,
    customerPhone,
    customerEmail,
    transactionDate,
    splitMode,
    splitPayments,
    isAmountPaidManual,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setDiscountPct,
    setTaxPct,
    setDiscountMode,
    setPaymentMethod,
    setAmountPaid,
    setCustomerName,
    setCustomerPhone,
    setCustomerEmail,
    setTransactionDate,
    setSplitMode,
    setSplitPayments,
    promoCodeId,
    setPromoCodeId,
    setIsAmountPaidManual,
    toCreateInput,
  };
}
