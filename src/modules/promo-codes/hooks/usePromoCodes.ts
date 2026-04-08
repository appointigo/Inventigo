"use client";

import { useState, useEffect, useCallback } from "react";
import type { PromoCode, CreatePromoInput, UpdatePromoInput, PromoUsageSale } from "../types";

export function usePromoCodes() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promo-codes");
      if (res.ok) setPromos(await res.json());
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const createPromo = async (input: CreatePromoInput): Promise<{ data?: PromoCode; error?: string }> => {
    const res = await fetch("/api/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Failed to create promo" };
    await fetchPromos();
    return { data: json };
  };

  const updatePromo = async (id: string, input: UpdatePromoInput): Promise<{ data?: PromoCode; error?: string }> => {
    const res = await fetch(`/api/promo-codes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Failed to update promo" };
    setPromos((prev) => prev.map((p) => (p.id === id ? (json as PromoCode) : p)));
    return { data: json };
  };

  const deletePromo = async (id: string): Promise<{ error?: string }> => {
    const res = await fetch(`/api/promo-codes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      return { error: json.error ?? "Failed to delete promo" };
    }
    await fetchPromos();
    return {};
  };

  return { promos, loading, refresh: fetchPromos, createPromo, updatePromo, deletePromo };
}

export function usePromoUsage(promoId: string | null) {
  const [usage, setUsage] = useState<PromoUsageSale[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!promoId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/promo-codes/${encodeURIComponent(promoId)}/usage`);
      if (res.ok) setUsage(await res.json());
    } catch (error) {
      console.error("Failed to fetch promo usage:", error);
    } finally {
      setLoading(false);
    }
  }, [promoId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading };
}
