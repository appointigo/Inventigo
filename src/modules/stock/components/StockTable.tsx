"use client";

import { useMemo } from "react";
import { Table, Tag, Input, Select, Badge, Flex, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { StockLevelRow } from "../types";

interface StockTableProps {
  stockLevels: StockLevelRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | undefined;
  onStatusChange: (value: string | undefined) => void;
  onAdjust: (row: StockLevelRow) => void;
}

const statusColors = { OK: "green", LOW: "orange", OUT: "red" } as const;
const statusLabels = { OK: "In Stock", LOW: "Low Stock", OUT: "Out of Stock" } as const;

const StockTable = ({ stockLevels, loading, search, onSearchChange, statusFilter, onStatusChange, onAdjust }: StockTableProps) => {
  // Derive unique attribute keys from all rows (exclude internal/noise fields)
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of stockLevels) {
      Object.keys(row.attributes ?? {}).forEach((k) => {
        if (k !== "unit" && k !== "supplierId") keys.add(k);
      });
    }
    return [...keys];
  }, [stockLevels]);

  const columns: ColumnsType<StockLevelRow> = [
    {
      title: "Product",
      dataIndex: "productName",
      sorter: (a, b) => a.productName.localeCompare(b.productName),
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111827" }}>{name}</div>
          <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1 }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: "Variant SKU",
      dataIndex: "variantSku",
      width: 160,
      render: (variantSku: string | null) =>
        variantSku ? (
          <span
            style={{
              fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
              fontSize: 11.5,
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 5,
              padding: "2px 6px",
              letterSpacing: "0.3px",
            }}
          >
            {variantSku}
          </span>
        ) : (
          <span style={{ color: "#d1d5db", fontSize: 11.5 }}>—</span>
        ),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      responsive: ["lg"],
      render: (name: string) => <Tag>{name}</Tag>,
    },
    {
      title: "Brand",
      dataIndex: "brandName",
      responsive: ["md"],
    },
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 70,
      align: "center",
      render: (label: string) => <Tag color="blue">{label}</Tag>,
    },
    // Dynamic attribute columns — same pattern as billing page
    ...attributeKeys.map((key) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      key: `attr_${key}`,
      width: 90,
      responsive: ["lg" as const],
      render: (_: unknown, record: StockLevelRow) => {
        const val = record.attributes[key];
        return val != null && val !== "" ? (
          <span style={{ fontSize: 12.5, color: "#6b7280" }}>{String(val)}</span>
        ) : (
          <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
        );
      },
    })),
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 100,
      align: "center",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number) => {
        const color = qty === 0 ? "red" : qty <= 5 ? "orange" : "green";
        return <Badge color={color} text={qty} />;
      },
    },
    {
      title: "Reorder At",
      dataIndex: "reorderLevel",
      width: 100,
      align: "center",
      responsive: ["md"],
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      align: "center",
      render: (status: StockLevelRow["status"]) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 90,
      align: "center",
      render: (_, record) => (
        <a onClick={() => onAdjust(record)}>Adjust</a>
      ),
    },
  ];

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by product or SKU..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
        <Select
          placeholder="All Status"
          value={statusFilter}
          onChange={onStatusChange}
          allowClear
          style={{ width: 140 }}
          options={[
            { label: "In Stock", value: "ok" },
            { label: "Low Stock", value: "low" },
            { label: "Out of Stock", value: "out" },
          ]}
        />
      </Flex>
      <Table
        columns={columns}
        dataSource={stockLevels}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} entries` }}
        size="middle"
        scroll={{ x: 800 }}
        locale={{
          emptyText: !loading && stockLevels.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "#888" }}>
                  No stock entries yet. Add products to start tracking inventory levels.
                </span>
              }
            />
          ) : undefined,
        }}
      />
    </>
  );
}

export default StockTable;
