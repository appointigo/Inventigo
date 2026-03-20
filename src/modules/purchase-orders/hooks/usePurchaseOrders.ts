"use client";

import { useState, useEffect, useCallback } from "react";
import type { PurchaseOrder, POListFilters } from "../types";

export function usePurchaseOrders(filters?: Partial<POListFilters>) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.supplierId) params.set("supplierId", filters.supplierId);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      const res = await fetch(`/api/purchase-orders${qs ? `?${qs}` : ""}`);
      if (res.ok) setPurchaseOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters?.supplierId, filters?.status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { purchaseOrders, loading, refresh: fetchOrders };
}

export function usePurchaseOrder(id: string | null) {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}`);
      if (res.ok) setPurchaseOrder(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { purchaseOrder, loading, refresh: fetchOrder };
}
