"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const BILLING_PRODUCT_SEARCH_DEBOUNCE_MS = 300;
export const BILLING_PRODUCT_SEARCH_MIN_CHARS = 2;

export function useBillingProductSearch() {
  const [search, setSearch] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const explicitSearchRef = useRef<string | null>(null);
  const pendingExactSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (term.length < BILLING_PRODUCT_SEARCH_MIN_CHARS) {
      return;
    }

    const timer = setTimeout(() => {
      if (explicitSearchRef.current === term) return;
      setProductQuery(term);
    }, BILLING_PRODUCT_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const changeSearch = useCallback((value: string) => {
    explicitSearchRef.current = null;
    pendingExactSearchRef.current = null;
    setSearch(value);
    // Disable the previous query immediately so its request is aborted while typing continues.
    setProductQuery("");
  }, []);

  const submitExactSearch = useCallback((value?: string) => {
    const term = (value ?? search).trim();
    if (!term) return false;

    explicitSearchRef.current = term;
    pendingExactSearchRef.current = term;
    setSearch(term);
    setProductQuery(term);
    return true;
  }, [search]);

  const clearSearch = useCallback(() => {
    explicitSearchRef.current = null;
    pendingExactSearchRef.current = null;
    setSearch("");
    setProductQuery("");
  }, []);

  return {
    search,
    productQuery,
    pendingExactSearchRef,
    changeSearch,
    submitExactSearch,
    clearSearch,
  };
}
