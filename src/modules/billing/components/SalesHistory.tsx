"use client";

import { useState } from "react";
import { Table, Tag, Button, Space, Input, Select, DatePicker, Popconfirm, App, Typography, Card } from "antd";
import { EyeOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { SaleSummary, Sale, SaleFilters, PaymentMethodType, SaleStatusType } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";
import InvoicePreview from "./InvoicePreview";

const { RangePicker } = DatePicker;

interface SalesHistoryProps {
  sales: SaleSummary[];
  loading: boolean;
  filters: SaleFilters;
  onFiltersChange: (filters: SaleFilters) => void;
  onRefund: (saleId: string) => Promise<void>;
  onViewSale: (saleId: string) => Promise<Sale | null>;
}

export default function SalesHistory({
  sales,
  loading,
  filters,
  onFiltersChange,
  onRefund,
  onViewSale,
}: SalesHistoryProps) {
  const { message } = App.useApp();
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const handleRefund = async (saleId: string) => {
    await onRefund(saleId);
    message.success("Sale refunded successfully");
  };

  const columns: ColumnsType<SaleSummary> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      width: 180,
      render: (inv: string) => <Typography.Text copyable>{inv}</Typography.Text>,
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      width: 150,
      render: (name: string | null) => name ?? <Typography.Text type="secondary">Walk-in</Typography.Text>,
    },
    {
      title: "Items",
      dataIndex: "itemCount",
      width: 60,
      align: "center",
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 110,
      align: "right",
      render: (total: number) => <Typography.Text strong>{formatCurrency(total)}</Typography.Text>,
    },
    {
      title: "Payment",
      dataIndex: "paymentMethod",
      width: 80,
      align: "center",
      render: (method: string) => <Tag>{method}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (status: string) => (
        <Tag color={status === "COMPLETED" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      width: 150,
      render: (date: string) => dayjs(date).format("DD MMM YYYY, hh:mm A"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          >
            View
          </Button>
          {record.status === "COMPLETED" && (
            <Popconfirm
              title="Refund this sale?"
              description="Stock will be restored for all items."
              onConfirm={() => handleRefund(record.id)}
            >
              <Button type="link" size="small" danger icon={<RollbackOutlined />}>
                Refund
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
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
              { label: "Refunded", value: "REFUNDED" },
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
      />

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
