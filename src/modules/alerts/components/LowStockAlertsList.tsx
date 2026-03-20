"use client";

import { Card, Table, Tag, Button, Empty, Badge } from "antd";
import { WarningOutlined, PlusCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { LowStockItem } from "../types";

interface LowStockAlertsListProps {
  items: LowStockItem[];
  loading: boolean;
  onCreatePO?: (item: LowStockItem) => void;
}

export default function LowStockAlertsList({ items, loading, onCreatePO }: LowStockAlertsListProps) {
  const columns: ColumnsType<LowStockItem> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.sku} · {record.sizeLabel}
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      width: 130,
    },
    {
      title: "Stock",
      dataIndex: "quantity",
      width: 80,
      align: "center",
      render: (qty: number) => (
        <Tag color={qty === 0 ? "error" : "warning"} style={{ fontWeight: 600 }}>
          {qty}
        </Tag>
      ),
    },
    {
      title: "Reorder Level",
      dataIndex: "reorderLevel",
      width: 120,
      align: "center",
    },
    {
      title: "Deficit",
      dataIndex: "deficit",
      width: 80,
      align: "center",
      render: (val: number) => <span style={{ color: "#ff4d4f", fontWeight: 600 }}>−{val}</span>,
    },
  ];

  if (onCreatePO) {
    columns.push({
      title: "",
      key: "action",
      width: 60,
      align: "center",
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<PlusCircleOutlined />}
          onClick={() => onCreatePO(record)}
          title="Create PO"
        />
      ),
    });
  }

  return (
    <Card
      title={
        <span>
          <WarningOutlined style={{ color: "#faad14", marginRight: 8 }} />
          Low Stock Alerts
          {items.length > 0 && (
            <Badge count={items.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      }
      size="small"
    >
      {items.length === 0 && !loading ? (
        <Empty description="All stock levels are healthy" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table<LowStockItem>
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />
      )}
    </Card>
  );
}
