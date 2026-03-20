"use client";

import { useState, useCallback } from "react";
import { Typography, Tabs, message } from "antd";
import StockTable from "@/modules/stock/components/StockTable";
import StockAdjustmentModal from "@/modules/stock/components/StockAdjustmentModal";
import MovementHistoryTable from "@/modules/stock/components/MovementHistoryTable";
import { useStockLevels, useStockMovements } from "@/modules/stock/hooks/useStock";
import type { MockStockRow } from "@/modules/stock/services/mockStockService";

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [adjustingRow, setAdjustingRow] = useState<MockStockRow | null>(null);

  const { stockLevels, loading, refresh } = useStockLevels({
    search: search || undefined,
    lowStockOnly: statusFilter === "low" || undefined,
    outOfStockOnly: statusFilter === "out" || undefined,
  });
  const { movements, loading: movementsLoading, refresh: refreshMovements } = useStockMovements();

  const handleAdjust = useCallback(
    async (values: {
      productId: string;
      sizeId: string;
      quantity: number;
      type: "IN" | "OUT" | "ADJUSTMENT";
      reason?: string;
    }) => {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to adjust stock");
        return;
      }
      message.success("Stock adjusted");
      setAdjustingRow(null);
      refresh();
      refreshMovements();
    },
    [refresh, refreshMovements]
  );

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Stock Management
      </Typography.Title>
      <Tabs
        defaultActiveKey="levels"
        items={[
          {
            key: "levels",
            label: "Stock Levels",
            children: (
              <StockTable
                stockLevels={stockLevels}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                onAdjust={setAdjustingRow}
              />
            ),
          },
          {
            key: "movements",
            label: "Movement History",
            children: (
              <MovementHistoryTable
                movements={movements}
                loading={movementsLoading}
              />
            ),
          },
        ]}
      />
      <StockAdjustmentModal
        stockRow={adjustingRow}
        open={!!adjustingRow}
        onCancel={() => setAdjustingRow(null)}
        onSubmit={handleAdjust}
      />
    </div>
  );
}
