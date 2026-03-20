"use client";

import { Table, Button, Space, Tag, Input, Select, Popconfirm, Tooltip, Badge } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Product } from "../types";
import type { Category } from "@/modules/categories/types";
import type { Brand } from "@/modules/brands/types";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string | undefined;
  onCategoryChange: (value: string | undefined) => void;
  brandFilter: string | undefined;
  onBrandChange: (value: string | undefined) => void;
  onAdd: () => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function ProductTable({
  products,
  categories,
  brands,
  loading,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  brandFilter,
  onBrandChange,
  onAdd,
  onView,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const columns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      responsive: ["md"],
      render: (name: string) => <Tag>{name}</Tag>,
    },
    {
      title: "Brand",
      dataIndex: "brandName",
      responsive: ["md"],
    },
    {
      title: "Price",
      dataIndex: "basePrice",
      width: 120,
      align: "right",
      sorter: (a, b) => a.basePrice - b.basePrice,
      render: (price: number) => `₹${price.toLocaleString("en-IN")}`,
    },
    {
      title: "Stock",
      dataIndex: "totalStock",
      width: 100,
      align: "center",
      sorter: (a, b) => a.totalStock - b.totalStock,
      render: (total: number) => {
        const color = total === 0 ? "red" : total <= 10 ? "orange" : "green";
        return <Badge color={color} text={total} />;
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Space wrap>
          <Input
            placeholder="Search products..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={onCategoryChange}
            allowClear
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="All Brands"
            value={brandFilter}
            onChange={onBrandChange}
            allowClear
            style={{ width: 140 }}
            options={brands.map((b) => ({ label: b.name, value: b.id }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add Product
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} products` }}
      />
    </div>
  );
}
