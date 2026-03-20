"use client";

import { useState, useEffect, useCallback } from "react";
import type { Category } from "../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refresh: fetchCategories };
}

export function useCategory(id: string | null) {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/categories/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCategory(data))
      .finally(() => setLoading(false));
  }, [id]);

  return { category, loading };
}
