"use client";

import { Table, Tag, Button, Popconfirm, Space, Typography, Badge, Tooltip, Image } from "antd";
import { EditOutlined, DeleteOutlined, PaperClipOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { StoreExpense } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { PAYMENT_MODES, EXPENSE_STATUS } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ExpenseTableProps {
  expenses: StoreExpense[];
  loading: boolean;
  onEdit: (expense: StoreExpense) => void;
  onDelete: (id: string) => void;
  categories: ExpenseCategoryOption[];
  canModify?: boolean;
}

const paymentModeMap = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m]));

const ExpenseTable = ({
  expenses,
  loading,
  onEdit,
  onDelete,
  categories,
  canModify = false,
}: ExpenseTableProps) => {
  const colorMap = Object.fromEntries(categories.map((c) => [c.name, c.colorKey]));

  const columns: ColumnsType<StoreExpense> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
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
      render: (cat: string) => <Tag color={colorMap[cat] ?? "default"}>{cat}</Tag>,
      filters: categories.map((c) => ({ text: c.name, value: c.name })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (val: number, record) => (
        <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
          <Typography.Text strong>{formatCurrency(val)}</Typography.Text>
          {record.gstAmount ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              +{formatCurrency(record.gstAmount)} GST
            </Typography.Text>
          ) : null}
        </Space>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Payment",
      dataIndex: "paymentMode",
      key: "paymentMode",
      width: 130,
      render: (val: string | null) => {
        if (!val) return <Typography.Text type="secondary">—</Typography.Text>;
        const mode = paymentModeMap[val];
        return mode ? (
          <Tag variant="filled" color="default">
            {mode.icon} {mode.label}
          </Tag>
        ) : (
          <Typography.Text type="secondary">{val}</Typography.Text>
        );
      },
      filters: PAYMENT_MODES.map((m) => ({ text: `${m.icon} ${m.label}`, value: m.value })),
      onFilter: (value, record) => record.paymentMode === value,
    },
    {
      title: "Receipt",
      dataIndex: "receiptUrl",
      key: "receiptUrl",
      width: 80,
      align: "center",
      render: (url: string | null) =>
        url ? (
          url.toLowerCase().endsWith(".pdf") ? (
            <Tooltip title="View PDF" destroyOnHidden>
              <Typography.Link href={url} target="_blank" rel="noopener noreferrer">
                <PaperClipOutlined style={{ fontSize: 16 }} />
              </Typography.Link>
            </Tooltip>
          ) : (
            <Image
              src={url}
              alt="Receipt"
              width={32}
              height={32}
              style={{ objectFit: "cover", borderRadius: 4 }}
              preview={{ mask: "View", getContainer: () => document.body }}
            />
          )
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>—</Typography.Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (val: string) => {
        const s = EXPENSE_STATUS[val as keyof typeof EXPENSE_STATUS];
        if (!s) return <Badge status="default" text={val} />;
        return <Badge status={s.color} text={s.label} />;
      },
      filters: Object.entries(EXPENSE_STATUS).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Recurring",
      dataIndex: "isRecurring",
      key: "isRecurring",
      width: 100,
      render: (val: boolean, record) =>
        val ? (
          <Tag variant="filled" color="purple" style={{ fontSize: 11 }}>
            🔄 {record.recurrenceFreq ?? ""}
          </Tag>
        ) : null,
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
      width: 80,
      align: "center",
      fixed: "right",
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
      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} expenses` }}
      size="small"
      scroll={{ x: 1000 }}
    />
  );
}

export default ExpenseTable;