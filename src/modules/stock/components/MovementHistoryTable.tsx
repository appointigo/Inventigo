"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { StockMovementRow } from "../types";

interface MovementHistoryTableProps {
  movements: StockMovementRow[];
  loading: boolean;
}

const typeColors: Record<string, string> = {
  IN: "green",
  OUT: "red",
  SALE: "volcano",
  RETURN: "blue",
  ADJUSTMENT: "orange",
};

const MovementHistoryTable = ({ movements, loading }: MovementHistoryTableProps) => {
  const columns: ColumnsType<StockMovementRow> = [
    {
      title: "Product",
      dataIndex: "productName",
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 70,
      align: "center",
      render: (label: string) => <Tag color="blue">{label}</Tag>,
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 110,
      align: "center",
      render: (type: string) => <Tag color={typeColors[type] ?? "default"}>{type}</Tag>,
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      width: 80,
      align: "center",
      render: (qty: number, record) => {
        const prefix = record.type === "IN" || record.type === "RETURN" ? "+" : record.type === "ADJUSTMENT" ? (qty >= 0 ? "+" : "") : "-";
        return <span style={{ fontWeight: 500 }}>{prefix}{Math.abs(qty)}</span>;
      },
    },
    {
      title: "Reason",
      dataIndex: "reason",
      responsive: ["md"],
      render: (reason: string | null) => reason || <span style={{ color: "#ccc" }}>—</span>,
    },
    {
      title: "By",
      dataIndex: "userName",
      width: 120,
      responsive: ["lg"],
    },
    {
      title: "Date",
      dataIndex: "movementDate",
      width: 160,
      render: (date: string) => new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={movements}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} movements` }}
      size="middle"
    />
  );
}

export default MovementHistoryTable;