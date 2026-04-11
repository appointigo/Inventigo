"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoreExpense, ExpenseListFilters, ExpenseSummary } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";

export function useExpenses(filters?: Partial<ExpenseListFilters>) {
  const [expenses, setExpenses] = useState<StoreExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.storeId) params.set("storeId", filters.storeId);
      if (filters?.month) params.set("month", String(filters.month));
      if (filters?.year) params.set("year", String(filters.year));
      const qs = params.toString();
      const res = await fetch(`/api/expenses${qs ? `?${qs}` : ""}`);
      if (res.ok) setExpenses(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters?.storeId, filters?.month, filters?.year]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, refresh: fetchExpenses };
}

export function useExpenseSummary(storeId: string | null, year: number) {
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId, year: String(year) });
      const res = await fetch(`/api/expenses/summary?${params.toString()}`);
      if (res.ok) setSummary(await res.json());
    } finally {
      setLoading(false);
    }
  }, [storeId, year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, refresh: fetchSummary };
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses/categories");
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string, colorKey = "default"): Promise<ExpenseCategoryOption | null> => {
    const res = await fetch("/api/expenses/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, colorKey }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || "Failed to add category");
    }
    const created: ExpenseCategoryOption = await res.json();
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const removeCategory = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/expenses/categories/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) return false;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  return { categories, loading, refresh: fetchCategories, addCategory, removeCategory };
}
