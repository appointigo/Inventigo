"use client";

import { useState, useCallback, useEffect } from "react";
import { Typography, Tabs, Table, Tag, Select, Button, Space, DatePicker, Row, Col, Card, App } from "antd";
import { DownloadOutlined, FilterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDateTime } from "@/shared/utils/formatDate";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Types matching reportsService
type StockReportRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  brandName: string;
  sizeLabel: string;
  quantity: number;
  reorderLevel: number;
  status: "OK" | "LOW" | "OUT";
  costPrice: number;
  stockValue: number;
};

type MovementReportRow = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  type: string;
  quantity: number;
  reason: string | null;
  userName: string;
  createdAt: string;
};

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell ?? "");
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Stock Report Tab ────────────────────────────────────────────────────────

function StockReport() {
  const { message } = App.useApp();
  const [data, setData] = useState<StockReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [brandFilter, setBrandFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "stock" });
      if (categoryFilter) params.set("categoryName", categoryFilter);
      if (brandFilter) params.set("brandName", brandFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, brandFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique values from data for filter options
  const categories = [...new Set(data.map((r) => r.categoryName))].sort();
  const brands = [...new Set(data.map((r) => r.brandName))].sort();

  const exportCsv = () => {
    if (data.length === 0) {
      message.warning("No data to export");
      return;
    }
    const headers = ["Product", "SKU", "Category", "Brand", "Size", "Quantity", "Reorder Level", "Status", "Cost Price", "Stock Value"];
    const rows = data.map((r) => [
      r.productName, r.sku, r.categoryName, r.brandName, r.sizeLabel,
      String(r.quantity), String(r.reorderLevel), r.status, String(r.costPrice), String(r.stockValue),
    ]);
    downloadCsv("stock-report.csv", headers, rows);
    message.success("Stock report exported");
  };

  const columns: ColumnsType<StockReportRow> = [
    { title: "Product", dataIndex: "productName", sorter: (a, b) => a.productName.localeCompare(b.productName) },
    { title: "SKU", dataIndex: "sku", width: 120 },
    { title: "Category", dataIndex: "categoryName", width: 140 },
    { title: "Brand", dataIndex: "brandName", width: 110 },
    { title: "Size", dataIndex: "sizeLabel", width: 70, align: "center" },
    {
      title: "Qty", dataIndex: "quantity", width: 70, align: "center",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number) => (
        <span style={{ fontWeight: 600 }}>{qty}</span>
      ),
    },
    {
      title: "Status", dataIndex: "status", width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = { OK: "success", LOW: "warning", OUT: "error" };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: "Cost", dataIndex: "costPrice", width: 100, align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Stock Value", dataIndex: "stockValue", width: 120, align: "right",
      sorter: (a, b) => a.stockValue - b.stockValue,
      render: (v: number) => formatCurrency(v),
    },
  ];

  const totalValue = data.reduce((sum, r) => sum + r.stockValue, 0);
  const totalQty = data.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            allowClear
            placeholder="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c, value: c }))}
            suffixIcon={<FilterOutlined />}
          />
        </Col>
        <Col>
          <Select
            allowClear
            placeholder="Brand"
            value={brandFilter}
            onChange={setBrandFilter}
            style={{ width: 140 }}
            options={brands.map((b) => ({ label: b, value: b }))}
          />
        </Col>
        <Col>
          <Select
            allowClear
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { label: "In Stock", value: "OK" },
              { label: "Low Stock", value: "LOW" },
              { label: "Out of Stock", value: "OUT" },
            ]}
          />
        </Col>
        <Col flex="auto" style={{ textAlign: "right" }}>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large">
          <span>Total Items: <strong>{data.length}</strong></span>
          <span>Total Quantity: <strong>{totalQty}</strong></span>
          <span>Total Value: <strong>{formatCurrency(totalValue)}</strong></span>
        </Space>
      </Card>

      <Table<StockReportRow>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
        size="small"
        scroll={{ x: 900 }}
      />
    </div>
  );
}

// ─── Movement History Tab ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  IN: "success",
  OUT: "error",
  SALE: "volcano",
  RETURN: "cyan",
  ADJUSTMENT: "warning",
};

function MovementReport() {
  const { message } = App.useApp();
  const [data, setData] = useState<MovementReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "movements" });
      if (typeFilter) params.set("movementType", typeFilter);
      if (dateRange) {
        params.set("startDate", dateRange[0]);
        params.set("endDate", dateRange[1]);
      }
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCsv = () => {
    if (data.length === 0) {
      message.warning("No data to export");
      return;
    }
    const headers = ["Product", "SKU", "Size", "Type", "Quantity", "Reason", "By", "Date"];
    const rows = data.map((r) => [
      r.productName, r.sku, r.sizeLabel, r.type, String(r.quantity),
      r.reason ?? "", r.userName, r.createdAt,
    ]);
    downloadCsv("movement-report.csv", headers, rows);
    message.success("Movement report exported");
  };

  const columns: ColumnsType<MovementReportRow> = [
    {
      title: "Product", key: "product",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.productName}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{r.sku}</div>
        </div>
      ),
    },
    { title: "Size", dataIndex: "sizeLabel", width: 70, align: "center", render: (v: string) => <Tag>{v}</Tag> },
    {
      title: "Type", dataIndex: "type", width: 110,
      render: (type: string) => <Tag color={TYPE_COLORS[type] ?? "default"}>{type}</Tag>,
    },
    {
      title: "Qty", dataIndex: "quantity", width: 80, align: "center",
      render: (qty: number, r) => {
        const isNeg = r.type === "OUT" || r.type === "SALE" || qty < 0;
        return (
          <span style={{ color: isNeg ? "#ff4d4f" : "#52c41a", fontWeight: 600 }}>
            {isNeg && qty > 0 ? `−${qty}` : qty > 0 ? `+${qty}` : qty}
          </span>
        );
      },
    },
    { title: "Reason", dataIndex: "reason", render: (v: string | null) => v || "—" },
    { title: "By", dataIndex: "userName", width: 120 },
    {
      title: "Date", dataIndex: "createdAt", width: 160,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            allowClear
            placeholder="Movement Type"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 160 }}
            options={["IN", "OUT", "SALE", "RETURN", "ADJUSTMENT"].map((t) => ({ label: t, value: t }))}
            suffixIcon={<FilterOutlined />}
          />
        </Col>
        <Col>
          <RangePicker
            onChange={(_, dateStrings) => {
              if (dateStrings[0] && dateStrings[1]) {
                setDateRange([dateStrings[0], dateStrings[1]]);
              } else {
                setDateRange(null);
              }
            }}
          />
        </Col>
        <Col flex="auto" style={{ textAlign: "right" }}>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
        </Col>
      </Row>

      <Table<MovementReportRow>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
        size="small"
        scroll={{ x: 800 }}
      />
    </div>
  );
}

// ─── Reports Page ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const tabItems = [
    { key: "stock", label: "Stock Report", children: <StockReport /> },
    { key: "movements", label: "Movement History", children: <MovementReport /> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 16 }}>Reports</Title>
      <Tabs items={tabItems} defaultActiveKey="stock" />
    </div>
  );
}
