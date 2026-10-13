"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Steps,
  Table,
  Tag,
} from "antd";
import { CheckCircleOutlined, CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrder, POItem, ReceivePOInput } from "../types";
import styles from "./PurchaseWorkspace.module.css";

type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  variants: Array<{ sizeId: string; sizeLabel: string; variantSku: string; storeQuantity: number }>;
};
type Line = POItem & {
  key: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  heldQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  rejectionReason?: string;
  unitCostActual: number;
  batchReference?: string;
  notes?: string | null;
  resolutionMode?: "LINK_EXISTING" | "CREATE_PRODUCT";
  targetProductId?: string;
  targetSizeId?: string;
  newSku?: string;
  sellingPrice?: number;
};

interface Props {
  purchaseOrder: PurchaseOrder;
  onReceive: (input: ReceivePOInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function POReceiveForm({ purchaseOrder, onReceive, onCancel, loading }: Props) {
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [receivedAt, setReceivedAt] = useState(dayjs());
  const [receiptReference, setReceiptReference] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmationId] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<Line[]>(
    purchaseOrder.items
      .filter((item) => item.outstandingQuantity > 0)
      .map((item) => ({
        ...item,
        key: crypto.randomUUID(),
        receivedQuantity: item.outstandingQuantity,
        acceptedQuantity: item.itemKind === "EXISTING_PRODUCT" ? item.outstandingQuantity : 0,
        heldQuantity: item.itemKind === "EXISTING_PRODUCT" ? 0 : item.outstandingQuantity,
        rejectedQuantity: 0,
        damagedQuantity: 0,
        unitCostActual: item.unitCost,
        resolutionMode: item.itemKind === "PROVISIONAL_PRODUCT" ? "LINK_EXISTING" : undefined,
      }))
  );
  useEffect(() => {
    void fetch(
      `/api/purchase-orders/catalog?storeId=${encodeURIComponent(purchaseOrder.storeId)}&pageSize=50`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setCatalog(result?.items ?? []));
  }, [purchaseOrder.storeId]);
  const update = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const split = (line: Line) =>
    setLines((current) => [
      ...current,
      {
        ...line,
        key: crypto.randomUUID(),
        receivedQuantity: 0,
        acceptedQuantity: 0,
        heldQuantity: 0,
        rejectedQuantity: 0,
        damagedQuantity: 0,
        targetProductId: undefined,
        targetSizeId: undefined,
        newSku: undefined,
      },
    ]);
  const totals = useMemo(
    () => ({
      ordered: purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0),
      previouslyReceived: purchaseOrder.items.reduce(
        (sum, item) => sum + item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity,
        0
      ),
      arriving: lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
      accepted: lines.reduce((sum, line) => sum + line.acceptedQuantity, 0),
      held: lines.reduce((sum, line) => sum + line.heldQuantity, 0),
      rejected: lines.reduce((sum, line) => sum + line.rejectedQuantity, 0),
    }),
    [lines, purchaseOrder.items]
  );
  const valid = () => {
    if (!lines.some((line) => line.receivedQuantity > 0)) return "Enter an arriving quantity";
    for (const line of lines.filter((item) => item.receivedQuantity > 0)) {
      if (
        line.acceptedQuantity + line.heldQuantity + line.rejectedQuantity !==
        line.receivedQuantity
      )
        return "Accepted + held + rejected must equal arriving for every group";
      if (line.receivedQuantity > line.outstandingQuantity)
        return "A mapping group exceeds its source line outstanding quantity";
      if (line.damagedQuantity > line.heldQuantity + line.rejectedQuantity)
        return "Damaged quantity must be held or rejected";
      if (line.damagedQuantity > 0 && !line.rejectionReason?.trim())
        return "Add a defect reason for damaged goods";
      if (line.itemKind === "PROVISIONAL_PRODUCT" && line.acceptedQuantity > 0) {
        if (
          line.resolutionMode === "LINK_EXISTING" &&
          (!line.targetProductId || !line.targetSizeId)
        )
          return "Map each accepted provisional group to a catalog variant";
        if (line.resolutionMode === "CREATE_PRODUCT" && (!line.newSku || !line.sellingPrice))
          return "SKU and selling price are required for a new catalog product";
      }
    }
    const bySource = new Map<string, number>();
    lines.forEach((line) =>
      bySource.set(line.id, (bySource.get(line.id) ?? 0) + line.receivedQuantity)
    );
    if (
      [...bySource.entries()].some(
        ([id, quantity]) =>
          quantity > (purchaseOrder.items.find((item) => item.id === id)?.outstandingQuantity ?? 0)
      )
    )
      return "Split groups exceed the source PO line outstanding quantity";
    return null;
  };
  const post = async () => {
    const error = valid();
    if (error) return message.error(error);
    await onReceive({
      confirmationId,
      receivedAt: receivedAt.toISOString(),
      receiptReference: receiptReference || undefined,
      supplierInvoiceNumber: supplierInvoiceNumber || undefined,
      notes: notes || undefined,
      items: lines
        .filter((line) => line.receivedQuantity > 0)
        .map((line) => ({
          mappingKey: line.key,
          purchaseOrderItemId: line.id,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          heldQuantity: line.heldQuantity,
          rejectedQuantity: line.rejectedQuantity,
          damagedQuantity: line.damagedQuantity,
          rejectionReason: line.rejectionReason,
          defectReason: line.rejectionReason,
          defectQuantity: line.damagedQuantity || undefined,
          batchReference: line.batchReference,
          unitCostActual: line.unitCostActual,
        notes: line.notes || undefined,
          catalogResolution:
            line.itemKind !== "PROVISIONAL_PRODUCT" || line.acceptedQuantity === 0
              ? undefined
              : line.resolutionMode === "CREATE_PRODUCT"
                ? { mode: "CREATE_PRODUCT", sku: line.newSku, sellingPrice: line.sellingPrice }
                : {
                    mode: "LINK_EXISTING",
                    productId: line.targetProductId!,
                    sizeId: line.targetSizeId!,
                  },
        })),
    });
  };
  const columns: ColumnsType<Line> = [
    {
      title: "PO line / mapping group",
      width: 220,
      render: (_, row) => (
        <div>
          <strong>{row.productName}</strong>
          <div style={{ fontSize: 12, color: "#718096" }}>
            {row.sizeLabel} · ordered {row.quantity} · prior accepted {row.acceptedQuantity}
          </div>
          {row.itemKind === "PROVISIONAL_PRODUCT" && <Tag color="purple">Needs mapping</Tag>}
        </div>
      ),
    },
    {
      title: "Arriving",
      width: 92,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.receivedQuantity}
          onChange={(value) => update(row.key, { receivedQuantity: value ?? 0 })}
        />
      ),
    },
    {
      title: "Accepted",
      width: 92,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.acceptedQuantity}
          onChange={(value) => update(row.key, { acceptedQuantity: value ?? 0 })}
        />
      ),
    },
    {
      title: "Held",
      width: 92,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.heldQuantity}
          onChange={(value) => update(row.key, { heldQuantity: value ?? 0 })}
        />
      ),
    },
    {
      title: "Rejected",
      width: 92,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.rejectedQuantity}
          onChange={(value) => update(row.key, { rejectedQuantity: value ?? 0 })}
        />
      ),
    },
    {
      title: "Damaged",
      width: 92,
      render: (_, row) => (
        <InputNumber
          min={0}
          value={row.damagedQuantity}
          onChange={(value) => update(row.key, { damagedQuantity: value ?? 0 })}
        />
      ),
    },
    {
      title: "Actual cost",
      width: 120,
      render: (_, row) => (
        <InputNumber
          min={0}
          precision={2}
          prefix="₹"
          value={row.unitCostActual}
          onChange={(value) => update(row.key, { unitCostActual: value ?? 0 })}
        />
      ),
    },
    {
      title: "Batch / lot",
      width: 130,
      render: (_, row) => (
        <Input
          value={row.batchReference}
          onChange={(event) => update(row.key, { batchReference: event.target.value })}
        />
      ),
    },
    {
      title: "Defect reason",
      width: 180,
      render: (_, row) => (
        <Input
          disabled={!row.damagedQuantity && !row.rejectedQuantity}
          value={row.rejectionReason}
          onChange={(event) => update(row.key, { rejectionReason: event.target.value })}
        />
      ),
    },
    {
      title: "",
      width: 86,
      fixed: "right",
      render: (_, row) => (
        <Space size={2}>
          <Button
            type="text"
            title="Split into another SKU mapping"
            icon={<CopyOutlined />}
            onClick={() => split(row)}
          />
          {lines.filter((line) => line.id === row.id).length > 1 && (
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => setLines((current) => current.filter((line) => line.key !== row.key))}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card className={`${styles.panel} ${styles.steps}`}>
        <Steps
          current={step}
          items={[{ title: "Count" }, { title: "Identify" }, { title: "Map" }, { title: "Review" }]}
        />
      </Card>
      <Card
        className={styles.panel}
        title={`${purchaseOrder.poNumber} · ${purchaseOrder.supplierName}`}
        style={{ marginBottom: 16 }}
      >
        <div className={styles.kpiGrid}>
          {[
            ["Ordered", totals.ordered],
            ["Previously received", totals.previouslyReceived],
            ["Current delivery", totals.arriving],
            [
              "Pending after delivery",
              Math.max(0, totals.ordered - totals.previouslyReceived - totals.arriving),
            ],
          ].map(([label, value]) => (
            <div key={label} className={styles.kpi}>
              <div className={styles.kpiLabel}>{label}</div>
              <div className={styles.kpiValue}>{value}</div>
            </div>
          ))}
        </div>
        <Form layout="inline">
          <Form.Item label="Receipt reference">
            <Input
              value={receiptReference}
              onChange={(event) => setReceiptReference(event.target.value)}
            />
          </Form.Item>
          <Form.Item label="Receipt date">
            <DatePicker
              showTime
              value={receivedAt}
              onChange={(value) => value && setReceivedAt(value)}
            />
          </Form.Item>
          <Form.Item label="Optional supplier invoice">
            <Input
              value={supplierInvoiceNumber}
              onChange={(event) => setSupplierInvoiceNumber(event.target.value)}
            />
          </Form.Item>
        </Form>
      </Card>
      {step === 0 && (
        <Card className={styles.panel} title="Count physical arrival">
          <Alert
            type="info"
            showIcon
            message="Count only goods physically present. Missing quantities remain outstanding."
            style={{ marginBottom: 14 }}
          />
          <div className={styles.tableWrap}>
            <Table
              columns={columns}
              dataSource={lines}
              rowKey="key"
              pagination={false}
              scroll={{ x: 1350 }}
            />
          </div>
        </Card>
      )}
      {step === 1 && (
        <Card className={styles.panel} title="Identify condition">
          <p>
            Separate sellable, held and rejected quantities. Damaged is a condition and must be
            included in held or rejected.
          </p>
          <div className={styles.kpiGrid}>
            {[
              ["Arriving", totals.arriving],
              ["Accepted", totals.accepted],
              ["Held", totals.held],
              ["Rejected", totals.rejected],
            ].map(([label, value]) => (
              <div key={label} className={styles.kpi}>
                <div className={styles.kpiLabel}>{label}</div>
                <div className={styles.kpiValue}>{value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {step === 2 && (
        <Card className={styles.panel} title="Map accepted provisional goods">
          <Alert
            type="warning"
            showIcon
            message="One provisional PO line can be split into multiple mapping groups. Create one SKU per distinct variant, not one per physical piece."
            style={{ marginBottom: 14 }}
          />
          {lines
            .filter((line) => line.itemKind === "PROVISIONAL_PRODUCT" && line.receivedQuantity > 0)
            .map((line) => {
              const selected = catalog.find((item) => item.id === line.targetProductId);
              return (
                <Card
                  key={line.key}
                  size="small"
                  title={`${line.productName} · group ${line.receivedQuantity}`}
                  style={{ marginBottom: 10 }}
                >
                  <Space wrap>
                    <Select
                      value={line.resolutionMode}
                      onChange={(value) => update(line.key, { resolutionMode: value })}
                      options={[
                        { value: "LINK_EXISTING", label: "Link existing SKU" },
                        { value: "CREATE_PRODUCT", label: "Create product / variant" },
                      ]}
                      style={{ width: 190 }}
                    />
                    {line.resolutionMode === "LINK_EXISTING" ? (
                      <>
                        <Select
                          showSearch={{ optionFilterProp: "label" }}
                          value={line.targetProductId}
                          onChange={(value) =>
                            update(line.key, { targetProductId: value, targetSizeId: undefined })
                          }
                          options={catalog.map((item) => ({
                            value: item.id,
                            label: `${item.name} · ${item.sku}`,
                          }))}
                          style={{ width: 260 }}
                        />
                        <Select
                          value={line.targetSizeId}
                          onChange={(value) => update(line.key, { targetSizeId: value })}
                          options={selected?.variants.map((item) => ({
                            value: item.sizeId,
                            label: `${item.sizeLabel} · ${item.variantSku}`,
                          }))}
                          style={{ width: 220 }}
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          value={line.newSku}
                          onChange={(event) => update(line.key, { newSku: event.target.value })}
                          placeholder="New SKU"
                          style={{ width: 170 }}
                        />
                        <InputNumber
                          value={line.sellingPrice}
                          onChange={(value) =>
                            update(line.key, { sellingPrice: value ?? undefined })
                          }
                          min={0.01}
                          prefix="₹"
                          placeholder="Selling price"
                        />
                      </>
                    )}
                  </Space>
                </Card>
              );
            })}
        </Card>
      )}
      {step === 3 && (
        <Card className={styles.panel} title="Review and post">
          <Alert
            type="success"
            showIcon
            message={`Sellable stock will increase by ${totals.accepted}. Held and rejected quantities will not be available to POS.`}
          />
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="Receipt notes">
              <Input.TextArea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
              />
            </Form.Item>
          </Form>
        </Card>
      )}
      <div className={styles.mobileActions} style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <Button onClick={onCancel}>Cancel</Button>
        {step > 0 && <Button onClick={() => setStep((value) => value - 1)}>Back</Button>}
        {step < 3 ? (
          <Button
            type="primary"
            onClick={() => {
              const error = valid();
              if (error && step >= 1) message.error(error);
              else setStep((value) => value + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <Button type="primary" icon={<CheckCircleOutlined />} loading={loading} onClick={post}>
            Post Receipt
          </Button>
        )}
      </div>
    </div>
  );
}
