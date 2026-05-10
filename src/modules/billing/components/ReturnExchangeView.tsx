"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Input, InputNumber, Select, Space, Spin, Table, Typography, Divider, Tag, theme } from "antd";
import { SearchOutlined, SwapOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { SaleSummary, Sale, SaleItem, VariantRow, CartItem, PaymentMethodType } from "../types";
import { PAYMENT_OPTIONS } from "../constants";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ReturnExchangeViewProps {
  sales: SaleSummary[];
  loading: boolean;
  onFetchSale: (saleId: string) => Promise<Sale | null>;
  onCreateReturnTransaction: (
    saleId: string,
    payload: {
      type: "RETURN" | "EXCHANGE" | "RETURN_EXCHANGE";
      returnedItems: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      exchangedItems?: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      refundAmount: number;
      offsetAmount: number;
      refundMethod?: PaymentMethodType;
      reason?: string;
      condition?: string;
      notes?: string;
    }
  ) => Promise<void>;
  refreshSales: () => Promise<void>;
  initialSaleId?: string;
}

const { Text } = Typography;

const ReturnExchangeView = ({
  sales,
  loading,
  onFetchSale,
  onCreateReturnTransaction,
  refreshSales,
  initialSaleId,
}: ReturnExchangeViewProps) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [fetchingSale, setFetchingSale] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [exchangeItems, setExchangeItems] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethodType>("CASH");
  const [amountToCollect, setAmountToCollect] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { products, loading: productsLoading } = useProducts(
    productSearch.trim() ? { search: productSearch.trim() } : undefined
  );

  const availableSales = useMemo(
    () => sales.filter((item) => item.status === "COMPLETED"),
    [sales]
  );

  const saleOptions = useMemo(
    () =>
      availableSales.map((item) => ({
        label: `${item.invoiceNumber} — ${item.customerName ?? "Walk-in"}`,
        value: item.id,
      })),
    [availableSales]
  );

  useEffect(() => {
    if (!selectedSaleId) {
      setSale(null);
      setReturnQuantities({});
      setExchangeItems([]);
      setRefundMethod("CASH");
      setReason("");
      setCondition("");
      setNotes("");
      return;
    }

    const loadSale = async () => {
      setFetchingSale(true);
      try {
        const fetched = await onFetchSale(selectedSaleId);
        if (fetched) {
          setSale(fetched);
          setReturnQuantities({});
          setExchangeItems([]);
          setRefundMethod("CASH");
          setReason("");
          setCondition("");
          setNotes("");
        } else {
          message.error("Unable to load sale details.");
          setSale(null);
        }
      } catch {
        message.error("Failed to fetch sale details.");
        setSale(null);
      } finally {
        setFetchingSale(false);
      }
    };

    loadSale();
  }, [selectedSaleId, onFetchSale, message]);

  useEffect(() => {
    if (initialSaleId) setSelectedSaleId(initialSaleId);
  }, [initialSaleId]);

  const returnRows = useMemo(
    () =>
      sale?.items.map((item) => {
        const qty = returnQuantities[item.id] ?? 0;
        return {
          ...item,
          returnQty: Math.min(Math.max(qty, 0), item.quantity),
        };
      }) ?? [],
    [sale?.items, returnQuantities]
  );

  const returnedItems = useMemo(
    () =>
      returnRows
        .filter((item) => item.returnQty > 0)
        .map((item) => ({
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: item.returnQty,
          total: item.returnQty * item.unitPrice,
        })),
    [returnRows]
  );

  const returnedTotal = useMemo(
    () => returnedItems.reduce((sum, item) => sum + item.total, 0),
    [returnedItems]
  );

  const exchangeTotal = useMemo(
    () => exchangeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [exchangeItems]
  );

  const offsetAmount = Math.max(exchangeTotal - returnedTotal, 0);
  const refundAmount = Math.max(returnedTotal - exchangeTotal, 0);
  const netAmount = exchangeTotal - returnedTotal;
  const exchangeType =
    returnedItems.length > 0 && exchangeItems.length > 0
      ? "RETURN_EXCHANGE"
      : exchangeItems.length > 0
        ? "EXCHANGE"
        : "RETURN";
  const requiresRefundMethod = netAmount > 0 || refundAmount > 0;

  useEffect(() => {
    setAmountToCollect(offsetAmount);
  }, [offsetAmount]);

  const variantRows = useMemo((): VariantRow[] => {
    const rows: VariantRow[] = products.flatMap((product) =>
      product.stock.map((stock) => ({
        rowKey: `${product.id}-${stock.sizeId}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        externalBarcode: product.externalBarcode ?? null,
        variantSku: stock.variantSku ?? null,
        brandName: product.brandName,
        categoryName: product.categoryName,
        basePrice: product.basePrice,
        isActive: product.isActive,
        attributes: product.attributes,
        sizeId: stock.sizeId,
        sizeLabel: stock.sizeLabel,
        stockQty: stock.quantity,
      }))
    );

    if (!productSearch.trim()) return rows;

    const query = productSearch.toLowerCase().trim();
    const exactMatches = rows.filter(
      (row) => row.variantSku?.toLowerCase() === query || row.externalBarcode?.toLowerCase() === query
    );
    if (exactMatches.length > 0) return exactMatches;

    return rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(query) ||
        row.sku.toLowerCase().includes(query) ||
        row.variantSku?.toLowerCase().includes(query) ||
        row.externalBarcode?.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const handleReturnQtyChange = (itemId: string, value: number | null) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Number(value ?? 0)),
    }));
  };

  const handleAddExchangeItem = (row: VariantRow) => {
    const existing = exchangeItems.find(
      (item) => item.productId === row.productId && item.sizeId === row.sizeId
    );
    if (existing) {
      setExchangeItems((prev) =>
        prev.map((item) =>
          item.productId === row.productId && item.sizeId === row.sizeId
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, row.stockQty),
              }
            : item
        )
      );
      return;
    }

    setExchangeItems((prev) => [
      ...prev,
      {
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        sizeId: row.sizeId,
        sizeLabel: row.sizeLabel,
        attributes: row.attributes,
        quantity: 1,
        unitPrice: row.basePrice,
      },
    ]);
  };

  const handleExchangeQuantityChange = (productId: string, sizeId: string, value: number | null) => {
    setExchangeItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.sizeId === sizeId
          ? { ...item, quantity: Math.max(1, Number(value ?? 1)) }
          : item
      )
    );
  };

  const handleRemoveExchangeItem = (productId: string, sizeId: string) => {
    setExchangeItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.sizeId === sizeId))
    );
  };

  const saleColumns: ColumnsType<SaleItem & { returnQty: number }> = [
    {
      title: "Item",
      dataIndex: "productName",
      key: "productName",
      render: (_text, item) => (
        <div>
          <Text strong>{item.productName}</Text>
          <div style={{ marginTop: 2, color: "#6b7280", fontSize: 12 }}>
            {item.sku} • {item.sizeLabel}
          </div>
        </div>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 90,
      align: "center",
    },
    {
      title: "Return qty",
      dataIndex: "returnQty",
      key: "returnQty",
      width: 140,
      render: (_value, item) => (
        <InputNumber
          min={0}
          max={item.quantity}
          value={item.returnQty}
          onChange={(value) => handleReturnQtyChange(item.id, value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Unit price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right",
      render: (_value, item) => formatCurrency(item.returnQty * item.unitPrice),
    },
  ];

  const exchangeColumns: ColumnsType<CartItem> = [
    {
      title: "Item",
      dataIndex: "productName",
      key: "productName",
      render: (_text, item) => (
        <div>
          <Text strong>{item.productName}</Text>
          <div style={{ marginTop: 2, color: "#6b7280", fontSize: 12 }}>
            {item.sku} • {item.sizeLabel}
          </div>
        </div>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (value: number, item) => (
        <InputNumber
          min={1}
          value={value}
          onChange={(value) => handleExchangeQuantityChange(item.productId, item.sizeId, value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Unit price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right",
      render: (_value, item) => formatCurrency(item.quantity * item.unitPrice),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_value, item) => (
        <Button type="link" danger size="small" onClick={() => handleRemoveExchangeItem(item.productId, item.sizeId)}>
          Remove
        </Button>
      ),
    },
  ];

  const productColumns: ColumnsType<VariantRow> = [
    {
      title: "Item",
      dataIndex: "productName",
      key: "productName",
      render: (_text, row) => (
        <div>
          <Text strong>{row.productName}</Text>
          <div style={{ marginTop: 2, color: "#6b7280", fontSize: 12 }}>
            {row.sku} • {row.sizeLabel}
          </div>
        </div>
      ),
    },
    {
      title: "Stock",
      dataIndex: "stockQty",
      key: "stockQty",
      width: 90,
      align: "center",
      render: (value: number) => value,
    },
    {
      title: "Price",
      dataIndex: "basePrice",
      key: "basePrice",
      width: 120,
      align: "right",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      render: (_value, row) => (
        <Button
          type="primary"
          size="small"
          disabled={row.stockQty <= 0}
          onClick={() => handleAddExchangeItem(row)}
        >
          Add
        </Button>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!sale) {
      message.error("Select a sale before submitting.");
      return;
    }

    if (returnedItems.length === 0) {
      message.error("Select at least one returned item.");
      return;
    }

    if (requiresRefundMethod && !refundMethod) {
      message.error("Select a refund method for the refund amount.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreateReturnTransaction(sale.id, {
        type: exchangeType,
        returnedItems,
        exchangedItems: exchangeItems.map((item) => ({
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: item.quantity,
          total: item.quantity * item.unitPrice,
        })),
        refundAmount,
        offsetAmount: amountToCollect,
        refundMethod: requiresRefundMethod ? refundMethod : undefined,
        reason: reason || undefined,
        condition: condition || undefined,
        notes: notes || undefined,
      });

      message.success("Return / exchange processed successfully.");
      setSelectedSaleId(null);
      setSale(null);
      setReturnQuantities({});
      setExchangeItems([]);
      setProductSearch("");
      setRefundMethod("CASH");
      setReason("");
      setCondition("");
      setNotes("");
      await refreshSales();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to process return/exchange.";
      message.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <style jsx global>{`
        .return-exchange-table .ant-table-thead > tr > th {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
        }
        .return-exchange-table .ant-table-tbody > tr > td {
          padding: 8px 12px;
        }
        .return-exchange-table .ant-table-tbody > tr {
          height: 40px;
        }
        .return-exchange-table .ant-table-container::after,
        .return-exchange-table .ant-table-container::before {
          display: none;
        }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            size="small"
            title="Return / Exchange"
            styles={{ body: { padding: token.paddingSM } }}
            style={{ background: "#f8fafc", borderColor: token.colorBorderSecondary, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)" }}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string).toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Select a completed sale"
                  value={selectedSaleId ?? undefined}
                  onChange={(value) => setSelectedSaleId(value)}
                  options={saleOptions}
                  size="middle"
                  style={{ minWidth: 320, height: token.controlHeight }}
                  loading={loading}
                  allowClear
                />
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  onClick={refreshSales}
                  loading={loading}
                  size="middle"
                  style={{ height: token.controlHeight, paddingInline: token.paddingSM }}
                >
                  Refresh
                </Button>
              </div>

              <Card
                size="small"
                style={{ background: "#ffffff", borderColor: token.colorBorderSecondary }}
                styles={{ body: { padding: token.paddingXS } }}
              >
                {fetchingSale || (selectedSaleId && !sale) ? (
                  <div style={{ padding: 12, textAlign: "center" }}>
                    <Spin />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Invoice</Text>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sale?.invoiceNumber ?? "-"}</div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Customer</Text>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sale?.customerName ?? "Walk-in"}</div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Phone</Text>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sale?.customerPhone ?? "-"}</div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Invoice date</Text>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sale?.transactionDate ? new Date(sale.transactionDate).toLocaleString() : "-"}</div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Payment status</Text>
                      <div>
                        <Tag color={sale?.paymentStatus === "PAID" ? "green" : sale?.paymentStatus === "PARTIAL" ? "orange" : "default"} style={{ marginInlineEnd: 0 }}>
                          {sale?.paymentStatus ?? "-"}
                        </Tag>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Due</Text>
                      <div style={{ fontWeight: 700, fontSize: 14, color: sale?.amountDue ? "#dc2626" : "#16a34a" }}>
                        {sale ? formatCurrency(sale.amountDue) : "-"}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </Card>

          {sale && !fetchingSale && (
            <>
              <Card
                size="small"
                title={<span style={{ color: "#b42318" }}>Returned Items</span>}
                styles={{ body: { padding: token.paddingXS } }}
                style={{ borderColor: "#f4c7c3", background: "#fff7f5" }}
              >
                <Table
                  className="return-exchange-table"
                  columns={saleColumns}
                  dataSource={returnRows}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: "No sale items available." }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total returned</Text>
                  <Text strong style={{ color: "#b42318" }}>{formatCurrency(returnedTotal)}</Text>
                </div>
              </Card>

              <Card size="small" title="Exchange Items" styles={{ body: { padding: token.paddingXS } }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16 }}>
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, marginBottom: 12 }}>
                      <Input
                        placeholder="Search products by name / SKU / barcode"
                        prefix={<SearchOutlined />}
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        allowClear
                        size="middle"
                      />
                      <Select placeholder="All categories" options={[]} disabled size="middle" />
                    </div>
                    <Table
                      className="return-exchange-table"
                      columns={productColumns}
                      dataSource={variantRows}
                      rowKey="rowKey"
                      size="small"
                      pagination={{ pageSize: 6 }}
                      loading={productsLoading}
                      locale={{ emptyText: productSearch ? "No matching products." : "Start typing to find exchange items." }}
                    />
                  </div>
                  <Card size="small" title="Selected Exchange Items" styles={{ body: { padding: token.paddingXXS } }}>
                    {exchangeItems.length > 0 ? (
                      <Table
                        className="return-exchange-table"
                        columns={exchangeColumns}
                        dataSource={exchangeItems}
                        rowKey={(item) => `${item.productId}-${item.sizeId}`}
                        pagination={false}
                        size="small"
                      />
                    ) : (
                      <div style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>
                        No exchange items selected.
                      </div>
                    )}
                  </Card>
                </div>
              </Card>

              <Card size="small" title="Return Details" styles={{ body: { padding: token.paddingXS } }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
                  <Input
                    placeholder="Reason for return/exchange"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    size="middle"
                  />
                  <Input
                    placeholder="Product condition"
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                    size="middle"
                  />
                  <Input.TextArea
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={1}
                  />
                </div>
              </Card>
            </>
          )}
        </div>

        <Card
          size="small"
          title="Review & Settle"
          styles={{ body: { padding: token.paddingSM } }}
          style={{ position: "sticky", top: 16, alignSelf: "start", borderColor: token.colorBorderSecondary, boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)" }}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Summary</Text>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Total returned</Text>
                  <Text strong style={{ color: "#b42318" }}>{formatCurrency(returnedTotal)}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Total exchange</Text>
                  <Text strong style={{ color: "#2563eb" }}>{formatCurrency(exchangeTotal)}</Text>
                </div>
                <Divider style={{ margin: "6px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Price difference</Text>
                  <Text strong>{formatCurrency(exchangeTotal - returnedTotal)}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Amount to collect</Text>
                  <Text strong style={{ color: "#15803d" }}>{formatCurrency(amountToCollect)}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Amount to refund</Text>
                  <Text strong style={{ color: "#9333ea" }}>{formatCurrency(refundAmount)}</Text>
                </div>
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Payment method</Text>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                {PAYMENT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type={refundMethod === option.value ? "primary" : "default"}
                    onClick={() => setRefundMethod(option.value)}
                    size="small"
                    style={{ paddingInline: 4, height: token.controlHeightSM }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Amount to collect</Text>
              <InputNumber
                value={amountToCollect}
                onChange={(value) => setAmountToCollect(Number(value ?? 0))}
                size="middle"
                style={{ width: "100%", marginTop: 6, height: token.controlHeight }}
                min={0}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
                {[100, 500, 1000, amountToCollect].map((amt, index) => (
                  <Button
                    key={`${amt}-${index}`}
                    size="small"
                    onClick={() => setAmountToCollect(Number(amt))}
                    style={{ height: token.controlHeightSM }}
                  >
                    {formatCurrency(Number(amt))}
                  </Button>
                ))}
              </div>
            </div>

            <Input.TextArea placeholder="Additional notes (optional)" rows={3} />

            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={submitting}
              disabled={returnedItems.length === 0 || submitting || !sale}
              onClick={handleSubmit}
              style={{ width: "100%", height: token.controlHeightLG }}
            >
              Complete Exchange
            </Button>
            <Button type="default" danger style={{ width: "100%", height: token.controlHeight }}>
              Cancel
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ReturnExchangeView;
