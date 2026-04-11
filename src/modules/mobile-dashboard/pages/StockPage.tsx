"use client";

import { AlertOutlined, InboxOutlined } from "@ant-design/icons";
import { Empty, Segmented, Skeleton, Tag, Typography } from "antd";
import { useState } from "react";
import { useStockLevels } from "@/modules/stock/hooks/useStock";
import { useStore } from "@/providers/StoreProvider";
import { ListItem } from "../components/ListItem";
import { PageContainer } from "../components/PageContainer";
import { SearchBar } from "../components/SearchBar";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

export default function StockPage() {
  const { storeId } = useStore();
  const { moduleSearch, setModuleSearch } = useMobileWorkspace();
  const [status, setStatus] = useState<"all" | "low" | "out">("all");
  const { stockLevels, loading } = useStockLevels({
    storeId: storeId ?? undefined,
    search: moduleSearch.stock || undefined,
    lowStockOnly: status === "low" || undefined,
    outOfStockOnly: status === "out" || undefined,
  });

  return (
    <PageContainer
      title="Stock"
      subtitle="Mobile-friendly inventory monitoring"
      stickySlot={(
        <div style={{ display: "grid", gap: 12 }}>
          <SearchBar value={moduleSearch.stock} placeholder="Search stock" onChange={(value) => setModuleSearch("stock", value)} />
          <Segmented block value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ label: "All", value: "all" }, { label: "Low", value: "low" }, { label: "Out", value: "out" }]} />
        </div>
      )}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : stockLevels.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No stock rows found" />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {stockLevels.map((row) => (
            <ListItem
              key={row.id}
              leading={<div style={{ width: 44, height: 44, borderRadius: 14, background: row.status === "LOW" || row.status === "OUT" ? "#fff1f0" : "#ecfeff", color: row.status === "LOW" || row.status === "OUT" ? "#dc2626" : "#0f766e", display: "grid", placeItems: "center" }}>{row.status === "LOW" || row.status === "OUT" ? <AlertOutlined /> : <InboxOutlined />}</div>}
              title={row.productName}
              subtitle={`${row.sizeLabel} • Reorder at ${row.reorderLevel}`}
              meta={<Tag color={row.status === "OUT" ? "red" : row.status === "LOW" ? "orange" : "green"}>{row.status}</Tag>}
              action={<Typography.Text strong style={{ color: row.status === "LOW" || row.status === "OUT" ? "#dc2626" : "#0f766e" }}>{row.quantity} in stock</Typography.Text>}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
