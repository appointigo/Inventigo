"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import AnalyticsDateFilter from "@/modules/analytics/components/AnalyticsDateFilter";
import { useAnalyticsDateRange } from "@/modules/analytics/hooks/useAnalyticsDateRange";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./StockTransfersPage.module.css";

type Recommendation = {
  key: string;
  type: string;
  productId: string;
  sizeId: string;
  product: string;
  sku: string;
  variant: string;
  sourceStoreId: string | null;
  sourceStoreName: string | null;
  destinationStoreId: string;
  destinationStoreName: string;
  destinationRequirement: number;
  destinationCurrentStock: number;
  sourceProtectedStock: number | null;
  sourceTransferableExcess: number;
  recommendedQuantity: number;
  remainingSupplierRequirement: number;
  destinationCoverDays: number | null;
  sourceCoverAfterTransfer: number | null;
  evidenceQuality: string;
  transferredInventoryValue: number;
  reasons: string[];
};
type TransferItem = {
  id: string;
  requestedQuantity: number;
  approvedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  product: { name: string; sku: string };
  size: { label: string };
};
type Transfer = {
  id: string;
  status: string;
  createdAt: string;
  dispatchedAt?: string | null;
  expectedArrivalAt?: string | null;
  sourceStore: { id: string; name: string };
  destinationStore: { id: string; name: string };
  items: TransferItem[];
};

export default function StockTransfersPage() {
  const { message } = App.useApp();
  const { user } = useCurrentUser();
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("30d");
  const [tab, setTab] = useState("recommendations");
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [expectedArrivalAt, setExpectedArrivalAt] = useState<string>();
  const [receiving, setReceiving] = useState<Transfer | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState(0);
  const [damagedQuantity, setDamagedQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const organizationWide = Boolean(
    user && !user.storeId && ["OWNER", "ADMIN", "MANAGER"].includes(user.role)
  );

  const recommendations = useQuery({
    queryKey: ["transfer-recommendations", range.from, range.to],
    enabled: organizationWide,
    queryFn: async () => {
      const params = new URLSearchParams({ from: range.from, to: range.to, group: range.group });
      const response = await fetch(`/api/transfer-recommendations?${params}`);
      if (!response.ok)
        throw new Error((await response.json()).error ?? "Unable to load recommendations");
      return response.json() as Promise<{
        summary: { opportunities: number; supplierRequired: number; rebalancedValue: number };
        items: Recommendation[];
      }>;
    },
  });
  const transfers = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: async () => {
      const response = await fetch("/api/stock-transfers");
      if (!response.ok) throw new Error("Unable to load transfers");
      return response.json() as Promise<Transfer[]>;
    },
  });

  const action = async (transfer: Transfer, operation: "approve" | "dispatch" | "cancel") => {
    setSaving(true);
    try {
      const response = await fetch(
        operation === "cancel"
          ? `/api/stock-transfers/${transfer.id}`
          : `/api/stock-transfers/${transfer.id}/${operation}`,
        operation === "cancel"
          ? {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "CANCEL" }),
            }
          : { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Unable to ${operation}`);
      message.success(
        operation === "approve"
          ? "Transfer approved"
          : operation === "dispatch"
            ? "Transfer dispatched"
            : "Transfer cancelled"
      );
      await transfers.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const createDraft = async () => {
    if (!selected?.sourceStoreId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceStoreId: selected.sourceStoreId,
          destinationStoreId: selected.destinationStoreId,
          notes,
          expectedArrivalAt,
          recommendationEvidence: {
            destinationRequirement: selected.destinationRequirement,
            destinationCurrentStock: selected.destinationCurrentStock,
            sourceProtectedStock: selected.sourceProtectedStock,
            generatedFrom: selected.key,
          },
          items: [{ productId: selected.productId, sizeId: selected.sizeId, quantity }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to create draft");
      message.success("Transfer draft created for review");
      setSelected(null);
      setTab("workflow");
      await transfers.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Unable to create draft");
    } finally {
      setSaving(false);
    }
  };

  const receive = async () => {
    if (!receiving?.items[0]) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/stock-transfers/${receiving.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ itemId: receiving.items[0].id, receivedQuantity, damagedQuantity }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to receive transfer");
      message.success("Transfer receipt recorded");
      setReceiving(null);
      await transfers.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Unable to receive transfer");
    } finally {
      setSaving(false);
    }
  };

  const canApprove = organizationWide;
  const canDispatch = (row: Transfer) =>
    Boolean(user && (!user.storeId || user.storeId === row.sourceStore.id));
  const canReceive = (row: Transfer) =>
    Boolean(user && (!user.storeId || user.storeId === row.destinationStore.id));
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Inventory Intelligence</span>
          <h1>Inter-Store Transfers</h1>
          <p>Rebalance exact variants before placing avoidable supplier orders.</p>
        </div>
        <AnalyticsDateFilter range={range} onPreset={selectPreset} onCustom={selectCustom} />
      </header>
      {!organizationWide ? (
        <Alert
          showIcon
          type="info"
          title="Store-scoped view"
          description="You can view transfers involving your assigned store. Cross-store recommendations require organization-wide purchasing access."
        />
      ) : null}
      {organizationWide ? (
        <section className={styles.metrics}>
          <article>
            <span>Transfer opportunities</span>
            <strong>{recommendations.data?.summary.opportunities ?? "—"}</strong>
          </article>
          <article>
            <span>Supplier remainder</span>
            <strong>{recommendations.data?.summary.supplierRequired ?? "—"}</strong>
          </article>
          <article>
            <span>Reallocatable value</span>
            <strong>
              {recommendations.data
                ? formatCurrency(recommendations.data.summary.rebalancedValue)
                : "—"}
            </strong>
          </article>
        </section>
      ) : null}
      <section className={styles.surface}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "recommendations",
              label: "Recommended Transfers",
              disabled: !organizationWide,
              children: recommendations.isLoading ? (
                <Skeleton active />
              ) : (
                <Table
                  rowKey="key"
                  dataSource={recommendations.data?.items ?? []}
                  scroll={{ x: 1200 }}
                  columns={[
                    {
                      title: "Product",
                      render: (_, row) => (
                        <>
                          <strong>{row.product}</strong>
                          <div className={styles.muted}>
                            {row.sku} · {row.variant}
                          </div>
                        </>
                      ),
                    },
                    {
                      title: "Route",
                      render: (_, row) =>
                        row.sourceStoreName
                          ? `${row.sourceStoreName} → ${row.destinationStoreName}`
                          : `No source → ${row.destinationStoreName}`,
                    },
                    { title: "Need", dataIndex: "destinationRequirement" },
                    { title: "Source excess", dataIndex: "sourceTransferableExcess" },
                    { title: "Transfer", dataIndex: "recommendedQuantity" },
                    { title: "Supplier remainder", dataIndex: "remainingSupplierRequirement" },
                    { title: "Evidence", render: (_, row) => <Tag>{row.evidenceQuality}</Tag> },
                    {
                      title: "Decision",
                      render: (_, row) => (
                        <>
                          <Tag color={row.recommendedQuantity ? "green" : "orange"}>
                            {row.type.replaceAll("_", " ")}
                          </Tag>
                          <ul className={styles.reasons}>
                            {row.reasons.slice(0, 2).map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </>
                      ),
                    },
                    {
                      title: "",
                      render: (_, row) =>
                        row.recommendedQuantity > 0 ? (
                          <Button
                            onClick={() => {
                              setSelected(row);
                              setQuantity(row.recommendedQuantity);
                            }}
                          >
                            Create transfer
                          </Button>
                        ) : null,
                    },
                  ]}
                />
              ),
            },
            {
              key: "workflow",
              label: "Transfer Workflow",
              children: transfers.isLoading ? (
                <Skeleton active />
              ) : (
                <Table
                  rowKey="id"
                  dataSource={transfers.data ?? []}
                  scroll={{ x: 1100 }}
                  columns={[
                    {
                      title: "Transfer",
                      render: (_, row) => <span title={row.id}>{row.id.slice(0, 8)}</span>,
                    },
                    {
                      title: "Route",
                      render: (_, row) => `${row.sourceStore.name} → ${row.destinationStore.name}`,
                    },
                    {
                      title: "Product",
                      render: (_, row) =>
                        row.items
                          .map((item) => `${item.product.name} · ${item.size.label}`)
                          .join(", "),
                    },
                    {
                      title: "Requested",
                      render: (_, row) =>
                        row.items.reduce((sum, item) => sum + item.requestedQuantity, 0),
                    },
                    {
                      title: "Dispatched",
                      render: (_, row) =>
                        row.items.reduce((sum, item) => sum + item.dispatchedQuantity, 0),
                    },
                    {
                      title: "Received",
                      render: (_, row) =>
                        row.items.reduce((sum, item) => sum + item.receivedQuantity, 0),
                    },
                    {
                      title: "Damaged",
                      render: (_, row) =>
                        row.items.reduce((sum, item) => sum + item.damagedQuantity, 0),
                    },
                    {
                      title: "Status",
                      render: (_, row) => {
                        const damaged = row.items.reduce(
                          (sum, item) => sum + item.damagedQuantity,
                          0
                        );
                        const overdue = Boolean(
                          row.expectedArrivalAt &&
                          new Date(row.expectedArrivalAt) < new Date() &&
                          ["DISPATCHED", "PARTIALLY_RECEIVED"].includes(row.status)
                        );
                        return (
                          <Space direction="vertical" size={2}>
                            <Tag>{row.status.replaceAll("_", " ")}</Tag>
                            {overdue ? <Tag color="red">OVERDUE</Tag> : null}
                            {damaged ? <Tag color="orange">{damaged} DAMAGED</Tag> : null}
                          </Space>
                        );
                      },
                    },
                    {
                      title: "Age",
                      render: (_, row) =>
                        `${Math.max(0, Math.floor((Date.now() - new Date(row.createdAt).getTime()) / 86_400_000))}d`,
                    },
                    {
                      title: "Actions",
                      render: (_, row) => (
                        <Space>
                          {row.status === "DRAFT" && canApprove ? (
                            <Button loading={saving} onClick={() => action(row, "approve")}>
                              Approve
                            </Button>
                          ) : null}
                          {row.status === "APPROVED" && canDispatch(row) ? (
                            <Button loading={saving} onClick={() => action(row, "dispatch")}>
                              Dispatch
                            </Button>
                          ) : null}
                          {["DISPATCHED", "PARTIALLY_RECEIVED"].includes(row.status) &&
                          canReceive(row) ? (
                            <Button
                              loading={saving}
                              onClick={() => {
                                setReceiving(row);
                                setReceivedQuantity(0);
                                setDamagedQuantity(0);
                              }}
                            >
                              Receive
                            </Button>
                          ) : null}
                          {["DRAFT", "APPROVED"].includes(row.status) && canApprove ? (
                            <Button danger loading={saving} onClick={() => action(row, "cancel")}>
                              Cancel
                            </Button>
                          ) : null}
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </section>
      <Modal
        open={Boolean(selected)}
        title="Review transfer draft"
        okText="Create draft"
        confirmLoading={saving}
        onCancel={() => setSelected(null)}
        onOk={createDraft}
      >
        {selected ? (
          <>
            <p>
              <strong>
                {selected.sourceStoreName} → {selected.destinationStoreName}
              </strong>
            </p>
            <p>
              {selected.product} · {selected.variant}
            </p>
            <label>Quantity</label>
            <InputNumber
              min={1}
              max={selected.sourceTransferableExcess}
              value={quantity}
              onChange={(value) => setQuantity(Number(value ?? 1))}
              style={{ width: "100%" }}
            />
            <label>Notes</label>
            <Input.TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
            <label>Expected arrival</label>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              onChange={(value) => setExpectedArrivalAt(value?.toISOString())}
            />
          </>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(receiving)}
        title="Receive and reconcile"
        okText="Record receipt"
        confirmLoading={saving}
        onCancel={() => setReceiving(null)}
        onOk={receive}
      >
        <label>Received quantity</label>
        <InputNumber
          min={0}
          value={receivedQuantity}
          onChange={(value) => setReceivedQuantity(Number(value ?? 0))}
          style={{ width: "100%" }}
        />
        <label>Damaged / missing quantity</label>
        <InputNumber
          min={0}
          value={damagedQuantity}
          onChange={(value) => setDamagedQuantity(Number(value ?? 0))}
          style={{ width: "100%" }}
        />
      </Modal>
    </main>
  );
}
