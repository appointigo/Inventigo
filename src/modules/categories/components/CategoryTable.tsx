"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Popconfirm, Tooltip, Flex } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Category } from "../types";

interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function CategoryTable({
  categories,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const [search, setSearch] = useState("");

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<Category> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: "#888" }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      responsive: ["md"],
      render: (slug: string) => <Tag>{slug}</Tag>,
    },
    {
      title: "Sizes",
      dataIndex: "sizes",
      render: (sizes: Category["sizes"]) => (
        <Space size={[8, 8]} wrap>
          {sizes.map((s) => (
            <Tag key={s.id} color="blue">
              {s.label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Attributes",
      dataIndex: "attributeSchema",
      responsive: ["lg"],
      render: (schema: Category["attributeSchema"]) => (
        <span style={{ color: "#888" }}>
          {schema.fields.length} field{schema.fields.length !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      title: "Products",
      dataIndex: "productCount",
      width: 100,
      sorter: (a, b) => a.productCount - b.productCount,
      align: "center",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit" destroyOnHidden>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete category"
            description={
              record.productCount > 0
                ? "This category has products and cannot be deleted."
                : "Are you sure you want to delete this category?"
            }
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{
              danger: true,
              disabled: record.productCount > 0,
            }}
          >
            <Tooltip title={record.productCount > 0 ? "Has products" : "Delete"} destroyOnHidden>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.productCount > 0}
              />
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
          placeholder="Search categories..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          placeholder="Search categories..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add Category
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} categories` }}
        locale={{ emptyText: search ? "No categories match your search" : "No categories yet" }}
      />
    </div>
  );
}
