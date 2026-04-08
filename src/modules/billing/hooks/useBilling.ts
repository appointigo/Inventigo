"use client";

import { useState, useEffect, useCallback } from "react";
import type { Sale, SaleFilters, SaleSummary, CartItem, CreateSaleInput, PaymentMethodType } from "../types";

export function useSales(initialFilters?: SaleFilters) {
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SaleFilters>(initialFilters ?? {});

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      const qs = params.toString();
      const res = await fetch(`/api/billing${qs ? `?${qs}` : ""}`);
      if (res.ok) setSales(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch sales:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const createSale = async (input: CreateSaleInput): Promise<Sale> => {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create sale");
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

  const getSaleById = async (saleId: string): Promise<Sale | null> => {
    const res = await fetch(`/api/billing/${encodeURIComponent(saleId)}`);
    if (!res.ok) return null;
    return res.json();
  };

  return {
    sales,
    loading,
    filters,
    setFilters,
    createSale,
    refundSale,
    getSaleById,
    refresh: fetchSales,
  };
}

/** Cart state management hook */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

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
    setPaymentMethod("CASH");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const taxAmount = Math.round(subtotal * taxPct / 100);

  const toCreateInput = (): CreateSaleInput => ({
    items,
    paymentMethod,
    discountAmount,
    taxAmount,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
    customerEmail: customerEmail || undefined,
  });

  return {
    items,
    subtotal,
    discountPct,
    taxPct,
    discountAmount,
    taxAmount,
    paymentMethod,
    customerName,
    customerPhone,
    customerEmail,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setDiscountPct,
    setTaxPct,
    setPaymentMethod,
    setCustomerName,
    setCustomerPhone,
    setCustomerEmail,
    toCreateInput,
  };
}
