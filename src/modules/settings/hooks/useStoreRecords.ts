"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoreRecord, CreateStoreInput, UpdateStoreInput } from "../types";

export function useStoreRecords() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores");
      if (res.ok) setStores(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch stores:", error);
    } 
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const createStore = useCallback(
    async (input: CreateStoreInput): Promise<StoreRecord> => {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create failed");
      }

      const store = await res.json();
      await fetchStores();
      return store;
    }, [fetchStores]
  );

  const updateStore = useCallback(
    async (id: string, input: UpdateStoreInput): Promise<StoreRecord> => {
      const res = await fetch(`/api/stores/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }

      const store = await res.json();
      await fetchStores();
      return store;
    }, [fetchStores]
  );

  const deleteStore = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/stores/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Delete failed");
      }
      
      await fetchStores();
    }, [fetchStores]
  );

  return {
    stores,
    loading,
    refresh: fetchStores,
    createStore,
    updateStore,
    deleteStore,
  };
}
