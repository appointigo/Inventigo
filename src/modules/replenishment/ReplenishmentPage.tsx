"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Drawer, Select, Skeleton, Space, Table, Tag } from "antd";
import { useRouter } from "next/navigation";
import { useStore } from "@/providers/StoreProvider";
import AnalyticsDateFilter from "@/modules/analytics/components/AnalyticsDateFilter";
import { useAnalyticsDateRange } from "@/modules/analytics/hooks/useAnalyticsDateRange";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import styles from "./ReplenishmentPage.module.css";
type Row = {
  recommendationId: string;
  productId: string;
  product: string;
  sku: string;
  categoryId: string;
  category: string;
  brandId: string;
  brand: string;
  sizeId: string;
  variant: string;
  supplierId: string | null;
  supplier: string | null;
  currentStock: number;
  type: string;
  severity: string;
  recommendedQuantity: number | null;
  reasons: string[];
  reasonCodes: string[];
  evidenceQuality: string;
  evidence: Record<string, number | string | null>;
};
type Data = {
  scope: { storeName: string };
  range: { activeTradingDays: number; observationDays: number };
  methodology: Record<string, string>;
  summary: Record<string, number>;
  items: Row[];
  total: number;
  filters: {
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    suppliers: Array<{ id: string; name: string }>;
  };
};
type TransferOpportunity = {
  productId: string;
  sizeId: string;
  destinationStoreId: string;
  sourceStoreName: string | null;
  recommendedQuantity: number;
  remainingSupplierRequirement: number;
};
const colors: Record<string, string> = {
  REORDER: "red",
  STOCKOUT_RISK: "volcano",
  INBOUND_COVERS_DEMAND: "blue",
  OVERSTOCK: "orange",
  MARKDOWN_CANDIDATE: "purple",
  NO_REORDER: "default",
  MONITOR: "gold",
};
export default function ReplenishmentPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("30d");
  const [action, setAction] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();
  const [brandId, setBrandId] = useState<string>();
  const [supplierId, setSupplierId] = useState<string>();
  const [selected, setSelected] = useState<Row | null>(null);
  const [updating, setUpdating] = useState(false);
  const { message } = App.useApp();
  const { user } = useCurrentUser();
  const canCreatePO = Boolean(user && ["OWNER", "ADMIN", "MANAGER"].includes(user.role));
  const canViewTransfers = Boolean(canCreatePO && user && !user.storeId);
  const query = useQuery({
    queryKey: [
      "replenishment",
      storeId,
      range.from,
      range.to,
      action,
      categoryId,
      brandId,
      supplierId,
    ],
    enabled: Boolean(storeId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        storeId: storeId!,
        from: range.from,
        to: range.to,
        group: range.group,
      });
      if (action) params.set("action", action);
      if (categoryId) params.set("categoryId", categoryId);
      if (brandId) params.set("brandId", brandId);
      if (supplierId) params.set("supplierId", supplierId);
      const response = await fetch(`/api/replenishment?${params}`, { signal });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.error ??
            "Unable to load replenishment intelligence"
        );
      return response.json() as Promise<Data>;
    },
  });
  const transferQuery = useQuery({
    queryKey: ["transfer-recommendations", range.from, range.to],
    enabled: Boolean(storeId && canViewTransfers),
    queryFn: async () => {
      const params = new URLSearchParams({ from: range.from, to: range.to, group: range.group });
      const response = await fetch(`/api/transfer-recommendations?${params}`);
      if (!response.ok) return { items: [] as TransferOpportunity[] };
      return response.json() as Promise<{ items: TransferOpportunity[] }>;
    },
  });
  if (!storeId)
    return (
      <main className={styles.page}>
        <Alert showIcon type="info" title="Choose a store to load inventory actions." />
      </main>
    );
  const data = query.data;
  const transferFor = (row: Row) =>
    transferQuery.data?.items.find(
      (item) =>
        item.destinationStoreId === storeId &&
        item.productId === row.productId &&
        item.sizeId === row.sizeId &&
        item.recommendedQuantity > 0
    );
  const createPO = (row: Row, quantity = row.recommendedQuantity ?? 1) => {
    const params = new URLSearchParams({
      productId: row.productId,
      sizeId: row.sizeId,
      quantity: String(quantity),
      recommendationId: row.recommendationId,
    });
    if (row.supplierId) params.set("supplierId", row.supplierId);
    router.push(`/dashboard/purchase-orders/new?${params}`);
  };
  const updateDisposition = async (disposition: "DISMISSED" | "IGNORED") => {
    if (!selected) return;
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/replenishment/${encodeURIComponent(selected.recommendationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disposition }),
        }
      );
      if (!response.ok) throw new Error("Unable to update recommendation");
      message.success(disposition === "DISMISSED" ? "Recommendation dismissed" : "Marked ignored");
      setSelected(null);
      await query.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Unable to update recommendation");
    } finally {
      setUpdating(false);
    }
  };
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Inventory Intelligence</span>
          <h1>Inventory Action Center</h1>
          <p>
            Explainable variant-level replenishment, stockout, excess-capital and markdown signals.
          </p>
        </div>
        <div className={styles.controls}>
          <AnalyticsDateFilter range={range} onPreset={selectPreset} onCustom={selectCustom} />
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            Refresh
          </Button>
        </div>
      </header>
      {query.isError && (
        <Alert
          showIcon
          type="error"
          title="Inventory actions could not be loaded"
          description={query.error.message}
        />
      )}
      {query.isLoading || !data ? (
        <section className={styles.surface}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </section>
      ) : (
        <>
          <Alert
            showIcon
            type="info"
            title={`${data.range.activeTradingDays} trading days observed across ${data.range.observationDays} calendar days`}
            description={`${data.methodology.velocity} ${data.methodology.inbound}`}
          />
          <section className={styles.metrics}>
            {[
              ["Reorder now", data.summary.reorder],
              ["Stockout risk", data.summary.stockoutRisk],
              ["Inbound covers", data.summary.inboundCovers],
              ["Overstock", data.summary.overstock],
              ["Markdown", data.summary.markdown],
              ["Do not reorder", data.summary.noReorder],
              ["Low evidence", data.summary.monitor],
              ["Excess value", formatCurrency(data.summary.excessInventoryValue)],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          <div className={styles.filters}>
            <Select
              allowClear
              placeholder="Action"
              value={action}
              onChange={setAction}
              options={[
                "REORDER",
                "STOCKOUT_RISK",
                "INBOUND_COVERS_DEMAND",
                "OVERSTOCK",
                "MARKDOWN_CANDIDATE",
                "NO_REORDER",
                "MONITOR",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
            />
            <Select
              allowClear
              placeholder="Category"
              value={categoryId}
              onChange={setCategoryId}
              options={data.filters.categories.map((row) => ({ value: row.id, label: row.name }))}
            />
            <Select
              allowClear
              placeholder="Brand"
              value={brandId}
              onChange={setBrandId}
              options={data.filters.brands.map((row) => ({ value: row.id, label: row.name }))}
            />
            <Select
              allowClear
              placeholder="Supplier"
              value={supplierId}
              onChange={setSupplierId}
              options={data.filters.suppliers.map((row) => ({ value: row.id, label: row.name }))}
            />
          </div>
          <section className={styles.surface}>
            <Table
              rowKey="recommendationId"
              scroll={{ x: 1500 }}
              dataSource={data.items}
              onRow={(row) => ({ onClick: () => setSelected(row) })}
              columns={[
                {
                  title: "Product",
                  fixed: "left",
                  width: 200,
                  render: (_, row) => (
                    <>
                      <strong>{row.product}</strong>
                      <small className={styles.muted}>
                        {row.sku} · {row.variant}
                      </small>
                    </>
                  ),
                },
                { title: "Stock", dataIndex: "currentStock" },
                { title: "Velocity/day", render: (_, row) => row.evidence.velocity },
                {
                  title: "Cover",
                  render: (_, row) =>
                    row.evidence.coverDays === null
                      ? "Insufficient history"
                      : `${row.evidence.coverDays}d`,
                },
                { title: "Inbound", render: (_, row) => row.evidence.totalInbound },
                { title: "Lead time", render: (_, row) => `${row.evidence.leadTimeDays}d` },
                { title: "Demand", render: (_, row) => row.evidence.unfulfilledDemand },
                {
                  title: "Recommended",
                  dataIndex: "recommendedQuantity",
                  render: (value, row) => {
                    const transfer = transferFor(row);
                    if (transfer)
                      return (
                        <span>
                          {transfer.recommendedQuantity} transfer
                          <small className={styles.muted}>
                            {transfer.remainingSupplierRequirement} supplier
                          </small>
                        </span>
                      );
                    return value === null ? "—" : `${value} units`;
                  },
                },
                {
                  title: "Action",
                  dataIndex: "type",
                  render: (value: string) => (
                    <Tag color={colors[value]}>{value.replaceAll("_", " ")}</Tag>
                  ),
                },
                {
                  title: "Evidence",
                  dataIndex: "evidenceQuality",
                  render: (value: string) => <Tag>{value}</Tag>,
                },
                {
                  title: "",
                  render: (_, row) => {
                    const transfer = transferFor(row);
                    if (transfer)
                      return (
                        <Space>
                          <Button
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push("/dashboard/inventory-intelligence/transfers");
                            }}
                          >
                            Transfer available
                          </Button>
                          {transfer.remainingSupplierRequirement > 0 ? (
                            <Button
                              onClick={(event) => {
                                event.stopPropagation();
                                createPO(row, transfer.remainingSupplierRequirement);
                              }}
                            >
                              PO remainder
                            </Button>
                          ) : null}
                        </Space>
                      );
                    return canCreatePO && row.type === "REORDER" && row.recommendedQuantity ? (
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();
                          createPO(row);
                        }}
                      >
                        Create PO draft
                      </Button>
                    ) : null;
                  },
                },
              ]}
            />
          </section>
        </>
      )}
      <Drawer
        width={620}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.product} · ${selected.variant}` : "Recommendation"}
      >
        {selected && (
          <div className={styles.detail}>
            <Tag color={colors[selected.type]}>{selected.type.replaceAll("_", " ")}</Tag>
            <h2>
              {selected.recommendedQuantity === null
                ? "No precise quantity"
                : `${selected.recommendedQuantity} units recommended`}
            </h2>
            <ul>
              {selected.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <h3>Calculation evidence</h3>
            {Object.entries(selected.evidence).map(([key, value]) => (
              <p key={key}>
                <span>{key.replaceAll(/([A-Z])/g, " $1")}</span>
                <strong>{String(value ?? "Unavailable")}</strong>
              </p>
            ))}
            {transferFor(selected) ? (
              <Alert
                showIcon
                type="success"
                title={`${transferFor(selected)!.recommendedQuantity} units available from ${transferFor(selected)!.sourceStoreName}`}
                description={`${transferFor(selected)!.remainingSupplierRequirement} units remain for supplier replenishment.`}
              />
            ) : null}
            {canCreatePO ? (
              <Space wrap>
                {transferFor(selected) ? (
                  <Button
                    type="primary"
                    onClick={() => router.push("/dashboard/inventory-intelligence/transfers")}
                  >
                    Review transfer
                  </Button>
                ) : selected.type === "REORDER" && selected.recommendedQuantity ? (
                  <Button type="primary" onClick={() => createPO(selected)}>
                    Create reviewable PO draft
                  </Button>
                ) : null}
                <Button loading={updating} onClick={() => updateDisposition("IGNORED")}>
                  Ignore for now
                </Button>
                <Button danger loading={updating} onClick={() => updateDisposition("DISMISSED")}>
                  Dismiss
                </Button>
              </Space>
            ) : null}
          </div>
        )}
      </Drawer>
    </main>
  );
}
