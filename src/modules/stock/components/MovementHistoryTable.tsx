"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { StockMovementRow } from "../types";
import { INVENTORY_PAGE_SIZE_OPTIONS } from "../utils/pagination";

interface MovementHistoryTableProps {
  movements: StockMovementRow[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

const typeColors: Record<string, string> = {
  IN: "green",
  OUT: "red",
  SALE: "volcano",
  RETURN: "blue",
  ADJUSTMENT: "orange",
  TRANSFER_IN: "cyan",
  TRANSFER_OUT: "purple",
};

const MovementHistoryTable = ({
  movements,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
}: MovementHistoryTableProps) => {
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
        const prefix = ["IN", "RETURN", "TRANSFER_IN"].includes(record.type)
          ? "+"
          : record.type === "ADJUSTMENT"
            ? qty >= 0
              ? "+"
              : ""
            : "-";
        return (
          <span style={{ fontWeight: 500 }}>
            {prefix}
            {Math.abs(qty)}
          </span>
        );
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
      render: (date: string) =>
        new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={movements}
      rowKey="id"
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        pageSizeOptions: INVENTORY_PAGE_SIZE_OPTIONS,
        showSizeChanger: true,
        onChange: onPaginationChange,
        showTotal: (t) => `${t} movements`,
      }}
      size="middle"
    />
  );
};

export default MovementHistoryTable;
