"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Popconfirm, Tooltip, Switch, Flex } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Supplier } from "../types";

interface SupplierTableProps {
  suppliers: Supplier[];
  loading: boolean;
  onAdd: () => void;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (supplier: Supplier) => Promise<void>;
}

export default function SupplierTable({
  suppliers,
  loading,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}: SupplierTableProps) {
  const [search, setSearch] = useState("");

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (s.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const columns: ColumnsType<Supplier> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <a onClick={() => onView(record)} style={{ fontWeight: 500 }}>
          {name}
        </a>
      ),
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      render: (val: string | null) => val || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (val: string | null) => val || "—",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      render: (val: string | null) => val || "—",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (isActive: boolean, record) => (
        <Switch size="small" checked={isActive} onChange={() => onToggleActive(record)} />
      ),
    },
    {
      title: "POs",
      dataIndex: "poCount",
      width: 80,
      align: "center",
      sorter: (a, b) => a.poCount - b.poCount,
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="View" destroyOnHidden>
            <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit" destroyOnHidden>
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete supplier"
            description={
              record.poCount > 0
                ? "This supplier has purchase orders and cannot be deleted."
                : "Are you sure you want to delete this supplier?"
            }
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true, disabled: record.poCount > 0 }}
          >
            <Tooltip title={record.poCount > 0 ? "Has purchase orders" : "Delete"} destroyOnHidden>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={record.poCount > 0} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search suppliers..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add Supplier
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} suppliers` }}
      />
    </div>
  );
}
