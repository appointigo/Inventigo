"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Popconfirm, Tooltip, Switch } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Brand } from "../types";

interface BrandTableProps {
  brands: Brand[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (brand: Brand) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (brand: Brand) => Promise<void>;
}

export default function BrandTable({
  brands,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: BrandTableProps) {
  const [search, setSearch] = useState("");

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<Brand> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (isActive: boolean, record) => (
        <Switch
          size="small"
          checked={isActive}
          onChange={() => onToggleActive(record)}
        />
      ),
    },
    {
      title: "Products",
      dataIndex: "productCount",
      width: 100,
      align: "center",
      sorter: (a, b) => a.productCount - b.productCount,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete brand"
            description={
              record.productCount > 0
                ? "This brand has products and cannot be deleted."
                : "Are you sure you want to delete this brand?"
            }
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true, disabled: record.productCount > 0 }}
          >
            <Tooltip title={record.productCount > 0 ? "Has products" : "Delete"}>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={record.productCount > 0} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <Input
          placeholder="Search brands..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add Brand
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} brands` }}
      />
    </div>
  );
}
