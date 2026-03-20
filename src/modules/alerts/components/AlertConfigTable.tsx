"use client";

import { Table, Button, Space, Tag, Switch, Popconfirm, Tooltip, Flex } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AlertConfig } from "../types";

interface AlertConfigTableProps {
  configs: AlertConfig[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (config: AlertConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (config: AlertConfig) => Promise<void>;
}

export default function AlertConfigTable({
  configs,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: AlertConfigTableProps) {
  const columns: ColumnsType<AlertConfig> = [
    {
      title: "Scope",
      key: "scope",
      render: (_, record) => {
        if (record.productName) return <Tag color="blue">Product: {record.productName}</Tag>;
        if (record.categoryName) return <Tag color="purple">Category: {record.categoryName}</Tag>;
        return <Tag color="green">Global</Tag>;
      },
    },
    {
      title: "Threshold",
      dataIndex: "threshold",
      width: 110,
      align: "center",
      sorter: (a, b) => a.threshold - b.threshold,
      render: (val: number) => <span style={{ fontWeight: 600 }}>≤ {val}</span>,
    },
    {
      title: "Email",
      dataIndex: "notifyEmail",
      width: 80,
      align: "center",
      render: (val: boolean) => (val ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: "SMS",
      dataIndex: "notifySMS",
      width: 80,
      align: "center",
      render: (val: boolean) => (val ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: "Active",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (isActive: boolean, record) => (
        <Switch size="small" checked={isActive} onChange={() => onToggleActive(record)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit" destroyOnHidden>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete this alert rule?"
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Tooltip title="Delete" destroyOnHidden>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table<AlertConfig>
      rowKey="id"
      columns={columns}
      dataSource={configs}
      loading={loading}
      pagination={false}
      title={() => (
        <Flex justify="space-between" align="center">
          <span style={{ fontWeight: 600 }}>Alert Rules</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            Add Rule
          </Button>
        </Flex>
      )}
    />
  );
}
