"use client";

import { Table, Tag, Button, Popconfirm, Space, Typography } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { StoreExpense } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ExpenseTableProps {
  expenses: StoreExpense[];
  loading: boolean;
  onEdit: (expense: StoreExpense) => void;
  onDelete: (id: string) => void;
  categories: ExpenseCategoryOption[];
  canModify?: boolean; // ADMIN / MANAGER / OWNER only
}

export default function ExpenseTable({
  expenses,
  loading,
  onEdit,
  onDelete,
  categories,
  canModify = false,
}: ExpenseTableProps) {
  // Build a quick lookup: name → colorKey
  const colorMap = Object.fromEntries(categories.map((c) => [c.name, c.colorKey]));
  const columns: ColumnsType<StoreExpense> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (val: string) =>
        new Date(val).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 160,
      render: (cat: string) => (
        <Tag color={colorMap[cat] ?? "default"}>{cat}</Tag>
      ),
      filters: categories.map((c) => ({ text: c.name, value: c.name })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (val: number) => formatCurrency(val),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (val: string | null) =>
        val ? (
          <Typography.Text>{val}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) =>
        canModify ? (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => onEdit(record)}
            />
            <Popconfirm
              title="Delete this expense?"
              description="This action cannot be undone."
              onConfirm={() => onDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" type="text" danger />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  return (
    <Table<StoreExpense>
      dataSource={expenses}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      size="small"
    />
  );
}
