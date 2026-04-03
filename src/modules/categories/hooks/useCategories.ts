"use client";

import { useState, useEffect, useCallback } from "react";
import type { Category } from "../types";

export function useCategories(storeId?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
      const res = await fetch(`/api/categories${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } 
    catch (error) {
      console.error("Failed to fetch categories:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refresh: fetchCategories };
}

export function useCategory(id: string | null) {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategory = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`);
      const data = res.ok ? await res.json() : null;
      setCategory(data);
    } 
    catch (error) {
      console.error("Failed to fetch category:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return { category, loading };
}
