"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Select, Flex } from "antd";
import { PlusOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderStatus } from "@prisma/client";
import type { PurchaseOrder } from "../types";
import type { Supplier } from "@/modules/suppliers/types";
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from "@/shared/constants/statuses";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDate } from "@/shared/utils/formatDate";

interface POTableProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  loading: boolean;
  statusFilter?: PurchaseOrderStatus;
  onStatusChange: (status?: PurchaseOrderStatus) => void;
  supplierFilter?: string;
  onSupplierChange: (supplierId?: string) => void;
  onAdd: () => void;
  onView: (po: PurchaseOrder) => void;
}

export default function POTable({
  purchaseOrders,
  suppliers,
  loading,
  statusFilter,
  onStatusChange,
  supplierFilter,
  onSupplierChange,
  onAdd,
  onView,
}: POTableProps) {
  const [search, setSearch] = useState("");

  const filtered = purchaseOrders.filter(
    (po) =>
      po.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      po.id.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: "PO #",
      dataIndex: "id",
      width: 120,
      render: (id: string, record) => (
        <a onClick={() => onView(record)} style={{ fontWeight: 500 }}>
          {id.slice(0, 8).toUpperCase()}
        </a>
      ),
    },
    {
      title: "Supplier",
      dataIndex: "supplierName",
      sorter: (a, b) => a.supplierName.localeCompare(b.supplierName),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status: PurchaseOrderStatus) => (
        <Tag color={PO_STATUS_COLORS[status]}>{PO_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: "Items",
      dataIndex: "itemCount",
      width: 80,
      align: "center",
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      width: 130,
      align: "right",
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: "Ordered",
      dataIndex: "orderedAt",
      width: 120,
      render: (val: string | null) => (val ? formatDate(val) : "—"),
    },
    {
      title: "Received",
      dataIndex: "receivedAt",
      width: 120,
      render: (val: string | null) => (val ? formatDate(val) : "—"),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 120,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
      render: (val: string) => formatDate(val),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search POs..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(val) => onStatusChange(val || undefined)}
            allowClear
            style={{ width: 140 }}
            options={Object.entries(PO_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            placeholder="Supplier"
            value={supplierFilter}
            onChange={(val) => onSupplierChange(val || undefined)}
            allowClear
            style={{ width: 200 }}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          New Purchase Order
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} purchase orders` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
