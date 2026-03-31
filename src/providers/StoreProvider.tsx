"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type StoreContextType = {
  storeId: string | null;
  storeName: string;
  setStore: (id: string, name: string) => void;
  orgId: string | null;
  orgName: string;
  setOrg: (id: string, name: string) => void;
};

const StoreContext = createContext<StoreContextType>({
  storeId: null,
  storeName: "Main Store",
  setStore: () => {},
  orgId: null,
  orgName: "",
  setOrg: () => {},
});

export function StoreProvider({
  children,
  defaultStoreId,
  defaultStoreName = "Main Store",
  defaultOrgId = null,
  defaultOrgName = "",
}: {
  children: ReactNode;
  defaultStoreId: string | null;
  defaultStoreName?: string;
  defaultOrgId?: string | null;
  defaultOrgName?: string;
}) {
  const [storeId, setStoreId] = useState<string | null>(defaultStoreId);
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [orgId, setOrgId] = useState<string | null>(defaultOrgId);
  const [orgName, setOrgName] = useState(defaultOrgName);

  const setStore = (id: string, name: string) => {
    setStoreId(id);
    setStoreName(name);
  };

  const setOrg = (id: string, name: string) => {
    setOrgId(id);
    setOrgName(name);
  };

  return (
    <StoreContext.Provider value={{ storeId, storeName, setStore, orgId, orgName, setOrg }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
