"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useCart } from "@/modules/billing/hooks/useBilling";

export type MobileModuleKey = "dashboard" | "categories" | "brands" | "products" | "stock" | "billing";

type ProductFiltersState = {
  search: string;
  categoryId?: string;
  brandId?: string;
};

type MobileWorkspaceContextValue = {
  cart: ReturnType<typeof useCart>;
  moduleSearch: Record<MobileModuleKey, string>;
  setModuleSearch: (module: MobileModuleKey, value: string) => void;
  productFilters: ProductFiltersState;
  setProductFilters: (value: Partial<ProductFiltersState>) => void;
  resetProductFilters: () => void;
  isProductFilterOpen: boolean;
  openProductFilter: () => void;
  closeProductFilter: () => void;
};

const MobileWorkspaceContext = createContext<MobileWorkspaceContextValue | null>(null);

export function MobileWorkspaceProvider({ children }: { children: ReactNode }) {
  const cart = useCart();
  const [moduleSearch, setModuleSearchState] = useState<Record<MobileModuleKey, string>>({
    dashboard: "",
    categories: "",
    brands: "",
    products: "",
    stock: "",
    billing: "",
  });
  const [productFilters, setProductFiltersState] = useState<ProductFiltersState>({ search: "" });
  const [isProductFilterOpen, setIsProductFilterOpen] = useState(false);

  const value = useMemo<MobileWorkspaceContextValue>(() => ({
    cart,
    moduleSearch,
    setModuleSearch: (module, value) => {
      setModuleSearchState((current) => ({ ...current, [module]: value }));
      if (module === "products") {
        setProductFiltersState((current) => ({ ...current, search: value }));
      }
    },
    productFilters,
    setProductFilters: (value) => {
      setProductFiltersState((current) => ({ ...current, ...value }));
    },
    resetProductFilters: () => {
      setProductFiltersState({ search: moduleSearch.products });
    },
    isProductFilterOpen,
    openProductFilter: () => setIsProductFilterOpen(true),
    closeProductFilter: () => setIsProductFilterOpen(false),
  }), [cart, isProductFilterOpen, moduleSearch, productFilters]);

  return <MobileWorkspaceContext.Provider value={value}>{children}</MobileWorkspaceContext.Provider>;
}

export function useMobileWorkspace() {
  const context = useContext(MobileWorkspaceContext);
  if (!context) {
    throw new Error("useMobileWorkspace must be used within MobileWorkspaceProvider");
  }
  return context;
}
