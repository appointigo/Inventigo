"use client";

import { Card, Table, Tag, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RecentMovement } from "../types";
import { formatDateTime } from "@/shared/utils/formatDate";

interface RecentMovementsWidgetProps {
  movements: RecentMovement[];
  loading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  IN: "success",
  OUT: "error",
  SALE: "volcano",
  RETURN: "cyan",
  ADJUSTMENT: "warning",
};

export default function RecentMovementsWidget({ movements, loading }: RecentMovementsWidgetProps) {
  const columns: ColumnsType<RecentMovement> = [
    {
      title: "Product",
      key: "product",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.productName}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{r.sku} · {r.sizeLabel}</div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 100,
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] ?? "default"}>{type}</Tag>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 70,
      align: "center",
      render: (qty: number, r) => {
        const isNeg = r.type === "OUT" || r.type === "SALE" || qty < 0;
        return (
          <span style={{ color: isNeg ? "#ff4d4f" : "#52c41a", fontWeight: 600 }}>
            {isNeg && qty > 0 ? `−${qty}` : qty > 0 ? `+${qty}` : qty}
          </span>
        );
      },
    },
    {
      title: "By",
      dataIndex: "userName",
      width: 110,
      render: (name: string) => <span style={{ fontSize: 12 }}>{name}</span>,
    },
    {
      title: "Time",
      dataIndex: "movementDate",
      width: 140,
      render: (val: string) => <span style={{ fontSize: 12 }}>{formatDateTime(val)}</span>,
    },
  ];

  return (
    <Card title="Recent Stock Movements" size="small">
      {movements.length === 0 && !loading ? (
        <Empty description="No movements yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table<RecentMovement>
          rowKey="id"
          columns={columns}
          dataSource={movements}
          loading={loading}
          pagination={false}
          size="small"
        />
      )}
    </Card>
  );
}
