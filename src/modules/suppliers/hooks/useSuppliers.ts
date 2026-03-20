"use client";

import { useState, useEffect, useCallback } from "react";
import type { Supplier } from "../types";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return { suppliers, loading, refresh: fetchSuppliers };
}

export function useSupplier(id: string | null) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/suppliers/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSupplier(data))
      .finally(() => setLoading(false));
  }, [id]);

  return { supplier, loading };
}
