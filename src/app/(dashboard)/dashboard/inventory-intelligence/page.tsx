"use client";

import InventoryIntelligencePanel from "@/modules/inventory-intelligence/components/InventoryIntelligencePanel";
import { useStore } from "@/providers/StoreProvider";

export default function InventoryIntelligencePage() {
  const { storeId } = useStore();
  return (
    <div style={{ padding: 24 }}>
      <InventoryIntelligencePanel storeId={storeId ?? undefined} />
    </div>
  );
}
