"use client";

import { Table, Tag, Input, Select, Badge, Flex, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MockStockRow } from "../services/mockStockService";

interface StockTableProps {
  stockLevels: MockStockRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | undefined;
  onStatusChange: (value: string | undefined) => void;
  onAdjust: (row: MockStockRow) => void;
}

const statusColors = { OK: "green", LOW: "orange", OUT: "red" } as const;
const statusLabels = { OK: "In Stock", LOW: "Low Stock", OUT: "Out of Stock" } as const;

const StockTable = ({ stockLevels, loading, search, onSearchChange, statusFilter, onStatusChange, onAdjust }: StockTableProps) => {
  const columns: ColumnsType<MockStockRow> = [
    {
      title: "Product",
      dataIndex: "productName",
      sorter: (a, b) => a.productName.localeCompare(b.productName),
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.sku}</div>
        </div>
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
      render: (status: MockStockRow["status"]) => (
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