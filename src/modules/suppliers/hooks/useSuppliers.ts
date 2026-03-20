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
    } 
    catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } 
    finally {
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

  const fetchSupplier = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`);
      const data = res.ok ? await res.json() : null;
      setSupplier(data);
    } 
    catch (error) {
      console.error("Failed to fetch supplier:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  return { supplier, loading };
}
