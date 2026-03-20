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
};

const StoreContext = createContext<StoreContextType>({
  storeId: null,
  storeName: "Main Store",
  setStore: () => {},
});

export function StoreProvider({
  children,
  defaultStoreId,
  defaultStoreName = "Main Store",
}: {
  children: ReactNode;
  defaultStoreId: string | null;
  defaultStoreName?: string;
}) {
  const [storeId, setStoreId] = useState<string | null>(defaultStoreId);
  const [storeName, setStoreName] = useState(defaultStoreName);

  const setStore = (id: string, name: string) => {
    setStoreId(id);
    setStoreName(name);
  };

  return (
    <StoreContext.Provider value={{ storeId, storeName, setStore }}>
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
