"use client";

import { useState, useEffect, useCallback } from "react";
import { Select, Flex, Typography } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useStore } from "@/providers/StoreProvider";
import type { StoreRecord } from "@/modules/settings/types";

const { Text } = Typography;

export default function StoreSelector() {
  const { storeId, setStore } = useStore();
  const [stores, setStores] = useState<StoreRecord[]>([]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      if (res.ok) setStores(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleChange = (value: string) => {
    const store = stores.find((s) => s.id === value);
    if (store) setStore(store.id, store.name);
  };

  const activeStores = stores.filter((s) => s.isActive);

  return (
    <Flex align="center" gap={6}>
      <ShopOutlined style={{ color: "#8c8c8c" }} />
      <Text type="secondary" style={{ fontSize: 13 }}>Store:</Text>
      <Select
        value={storeId ?? undefined}
        onChange={handleChange}
        options={activeStores.map((s) => ({ value: s.id, label: s.name }))}
        style={{ minWidth: 140 }}
        size="small"
        variant="borderless"
        placeholder="Select store"
      />
    </Flex>
  );
}
