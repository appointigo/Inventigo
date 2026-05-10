"use client";

import { useState } from "react";
import { Table, Tag, Button, Space, Input, Select, DatePicker, Popconfirm, App, Typography, Card, Modal, Divider } from "antd";
import { EyeOutlined, RollbackOutlined, SearchOutlined, FileTextOutlined, SwapOutlined, ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { SaleSummary, Sale, SaleFilters, PaymentMethodType, SaleStatusType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import InvoicePreview from "./InvoicePreview";

const { RangePicker } = DatePicker;

interface SalesHistoryProps {
  sales: any[]; // unified rows: SALE | RETURN_TRANSACTION
  loading: boolean;
  filters: SaleFilters;
  onFiltersChange: (filters: SaleFilters) => void;
  onRefund: (saleId: string) => Promise<void>;
  onCollectBalance: (saleId: string, amount: number, paymentMethod: PaymentMethodType) => Promise<void>;
  onViewSale: (saleId: string) => Promise<Sale | null>;
  onOpenReturnExchange?: (saleId: string) => void;
}

export default function SalesHistory({
  sales,
  loading,
  filters,
  onFiltersChange,
  onRefund,
  onCollectBalance,
  onViewSale,
  onOpenReturnExchange,
}: SalesHistoryProps) {
  const { message } = App.useApp();
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReturn, setPreviewReturn] = useState<any | null>(null);
  const [previewReturnOpen, setPreviewReturnOpen] = useState(false);

  const handleView = async (saleId: string) => {
    const sale = await onViewSale(saleId);
    if (sale) {
      setPreviewSale(sale);
      setPreviewOpen(true);
    } 
    else {
      message.error("Failed to load sale details");
    }
  };

  const handleViewReturn = async (rt: any) => {
    // unified data already contains items — open local preview
    setPreviewReturn(rt);
    setPreviewReturnOpen(true);
  };

  const handleCollectBalance = async (saleId: string, amount: number, paymentMethod: PaymentMethodType) => {
    try {
      await onCollectBalance(saleId, amount, paymentMethod);
      message.success("Balance collected successfully");
    } catch (error) {
      message.error("Failed to collect remaining balance");
    }
  };

  const handleRefund = async (saleId: string) => {
    await onRefund(saleId);
    message.success("Sale refunded successfully");
  };

  const columns: ColumnsType<any> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      width: 260,
      render: (_: any, record: any) => {
        if (record.rowType === "SALE") {
          return (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <FileTextOutlined />
              <div>
                <Typography.Text copyable>{record.invoiceNumber}</Typography.Text>
              </div>
            </div>
          );
        }

        // RETURN_TRANSACTION
        const icon = record.type === "EXCHANGE" ? <SwapOutlined style={{ color: "#5b8cfa" }} /> : <ArrowLeftOutlined style={{ color: "#ff4d4f" }} />;
        return (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {icon}
              <Typography.Text copyable>{record.referenceNumber}</Typography.Text>
            </div>
            {record.saleInvoiceNumber && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>↳ {record.saleInvoiceNumber}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "rowType",
      width: 110,
      render: (_: any, record: any) => {
        if (record.rowType === "SALE") return <Tag color="default">Sale</Tag>;
        if (record.type === "EXCHANGE") return <Tag color="purple">Exchange</Tag>;
        if (record.type === "RETURN") return <Tag color="red">Return</Tag>;
        return <Tag color="orange">Both</Tag>;
      },
      align: "center",
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      width: 160,
      render: (name: string | null) => name ?? <Typography.Text type="secondary">Walk-in</Typography.Text>,
    },
    {
      title: "Items",
      dataIndex: "itemCount",
      width: 220,
      render: (_: any, record: any) => {
        if (record.rowType === "SALE") return record.itemCount;
        // return transaction items
        const lines: string[] = [];
        for (const it of record.items ?? []) {
          if (it.returnedProduct) lines.push(`↩ ${it.returnedProduct.name} ${it.returnedSize?.label ?? ""}`);
          if (it.newProduct) lines.push(`↪ ${it.newProduct.name} ${it.newSize?.label ?? ""}`);
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {lines.slice(0, 3).map((t, i) => (
              <div key={i} style={{ fontSize: 13 }}>{t}</div>
            ))}
            {lines.length > 3 && <div style={{ color: "#888", fontSize: 12 }}>+{lines.length - 3} more</div>}
          </div>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "total",
      width: 120,
      align: "right",
      render: (_: any, record: any) => {
        if (record.rowType === "SALE") return <Typography.Text strong>{formatCurrency(record.total)}</Typography.Text>;

        // RETURN_TRANSACTION
        if (record.netAmount > 0) {
          return (
            <div style={{ textAlign: "right" }}>
              <Typography.Text style={{ color: "#fa8c16", fontWeight: 600 }}>+{formatCurrency(record.netAmount)}</Typography.Text>
              <div style={{ fontSize: 11, color: "#888" }}>top-up</div>
            </div>
          );
        }
        if (record.refundAmount > 0) {
          return (
            <div style={{ textAlign: "right" }}>
              <Typography.Text style={{ color: "#52c41a", fontWeight: 600 }}>−{formatCurrency(record.refundAmount)}</Typography.Text>
              <div style={{ fontSize: 11, color: "#888" }}>refunded</div>
            </div>
          );
        }
        return <Typography.Text>₹0</Typography.Text>;
      },
    },
    {
      title: "Payment",
      dataIndex: "paymentMethod",
      width: 140,
      align: "center",
      render: (_: any, record: any) => {
        if (record.rowType === "SALE") {
          return (
            <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <Tag color={record.paymentStatus === "PAID" ? "green" : record.paymentStatus === "PARTIAL" ? "orange" : "red"}>
                {record.paymentStatus}
              </Tag>
              {record.amountDue > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatCurrency(record.amountDue)} due
                </Typography.Text>
              )}
            </div>
          );
        }

        // return transaction
        if (record.netAmount > 0) return <Tag color="green">COLLECTED</Tag>;
        if (record.refundAmount > 0) return <Tag color="green">REFUNDED</Tag>;
        return <Tag color="default">NIL</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      align: "center",
      render: (_: any, record: any) => {
        if (record.rowType === "RETURN_TRANSACTION") return <Tag color="green">COMPLETED</Tag>;
        if (record.status === "COMPLETED") return <Tag color="green">COMPLETED</Tag>;
        if (record.status === "EXCHANGED") return <Tag color="blue">EXCHANGED</Tag>;
        return <Tag color="red">REFUNDED</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_: any, record: any) => {
        if (record.rowType === "RETURN_TRANSACTION") {
          return (
            <Space>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewReturn(record)}>
                View
              </Button>
              <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => window.print()}>
                Print
              </Button>
            </Space>
          );
        }

        // SALE actions
        const createdAt = new Date(record.createdAt).getTime();
        const within30 = Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000;

        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id)}>
              View
            </Button>
            {record.amountDue > 0 && record.status === "COMPLETED" && record.paymentStatus === "PARTIAL" && (
              <Popconfirm title={`Collect ${formatCurrency(record.amountDue)} due?`} onConfirm={() => handleCollectBalance(record.id, record.amountDue, record.paymentMethod)}>
                <Button type="link" size="small" icon={<SearchOutlined />}>Collect</Button>
              </Popconfirm>
            )}
            {record.status === "COMPLETED" && within30 && (
              <Button type="link" size="small" onClick={() => onOpenReturnExchange?.(record.id)}>
                Return / Exchange
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search invoice or customer"
            prefix={<SearchOutlined />}
            value={filters.search ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="Payment method"
            value={filters.paymentMethod}
            onChange={(val) => onFiltersChange({ ...filters, paymentMethod: val as PaymentMethodType | undefined })}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: "Cash", value: "CASH" },
              { label: "Card", value: "CARD" },
              { label: "UPI", value: "UPI" },
            ]}
          />
          <Select
            placeholder="Status"
            value={filters.status}
            onChange={(val) => onFiltersChange({ ...filters, status: val as SaleStatusType | undefined })}
            allowClear
            style={{ width: 130 }}
            options={[
              { label: "Completed", value: "COMPLETED" },
              { label: "Exchanged", value: "EXCHANGED" },
              { label: "Refunded", value: "REFUNDED" },
            ]}
          />
          <Select
            placeholder="Type"
            value={filters.type ?? ""}
            onChange={(val) => onFiltersChange({ ...filters, type: val === "" ? undefined : (val as any) })}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: "All types", value: "" },
              { label: "Sales only", value: "SALE" },
              { label: "Exchanges only", value: "EXCHANGE" },
              { label: "Returns only", value: "RETURN" },
            ]}
          />
          <RangePicker
            onChange={(dates) => {
              onFiltersChange({
                ...filters,
                startDate: dates?.[0]?.toISOString() ?? undefined,
                endDate: dates?.[1]?.toISOString() ?? undefined,
              });
            }}
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={sales}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10 }}
        rowClassName={(record) => record.rowType === "RETURN_TRANSACTION" ? "return-transaction-row" : ""}
      />

      <style>{`
        .return-transaction-row {
          background-color: #f0f7ff !important;
          border-left: 3px solid #5b8cfa !important;
        }
        .return-transaction-row td {
          padding-left: 24px !important;
          font-size: 13px;
        }
      `}</style>

      <InvoicePreview
        sale={previewSale}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewSale(null);
        }}
      />
    </>
  );
}
