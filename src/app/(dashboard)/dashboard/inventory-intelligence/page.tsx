"use client";

import { Suspense } from "react";
import InventoryIntelligencePanel from "@/modules/inventory-intelligence/components/InventoryIntelligencePanel";
import { useStore } from "@/providers/StoreProvider";

export default function InventoryIntelligencePage() {
  const { storeId } = useStore();
  return (
    <div style={{ padding: 24 }}>
      <Suspense fallback={null}><InventoryIntelligencePanel storeId={storeId ?? undefined} /></Suspense>
    </div>
  );
}
