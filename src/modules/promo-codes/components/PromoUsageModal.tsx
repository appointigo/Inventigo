"use client";

import { Modal, Table, Tag, Typography, Empty, Spin, Flex } from "antd";
import type { ColumnsType } from "antd/es/table";
import { usePromoUsage } from "../hooks/usePromoCodes";
import type { PromoCode, PromoUsageSale } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDate } from "@/shared/utils/formatDate";

const { Text } = Typography;

interface PromoUsageModalProps {
  promo: PromoCode | null;
  open: boolean;
  onClose: () => void;
}

const columns: ColumnsType<PromoUsageSale> = [
  {
    title: "Date",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (v: string) => formatDate(v),
    sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    defaultSortOrder: "descend",
    width: 150,
  },
  {
    title: "Invoice",
    dataIndex: "invoiceNumber",
    key: "invoiceNumber",
    render: (v: string) => (
      <Text code style={{ fontSize: 12 }}>
        {v}
      </Text>
    ),
    width: 160,
  },
  {
    title: "Customer",
    key: "customer",
    render: (_, row) => (
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{row.customerName ?? "—"}</div>
        {row.customerPhone && (
          <div style={{ color: "#6b7280", fontSize: 12 }}>{row.customerPhone}</div>
        )}
      </div>
    ),
  },
  {
    title: "Sale Total",
    dataIndex: "total",
    key: "total",
    render: (v: number) => (
      <Text strong style={{ color: "#111827" }}>
        {formatCurrency(v)}
      </Text>
    ),
    align: "right",
    width: 120,
    sorter: (a, b) => a.total - b.total,
  },
  {
    title: "Discount Applied",
    dataIndex: "discountAmount",
    key: "discountAmount",
    render: (v: number) =>
      v > 0 ? (
        <Tag color="green" style={{ fontWeight: 600 }}>
          −{formatCurrency(v)}
        </Tag>
      ) : (
        <Text type="secondary">—</Text>
      ),
    align: "right",
    width: 140,
  },
];

const PromoUsageModal = ({ promo, open, onClose }: PromoUsageModalProps) => {
  const { usage, loading } = usePromoUsage(open && promo ? promo.id : null);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        promo ? (
          <Flex align="center" gap={10}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              Usage History —{" "}
              <Text code style={{ fontSize: 14 }}>
                {promo.code}
              </Text>
            </span>
            <Tag
              color="blue"
              style={{ fontWeight: 700, borderRadius: 12, marginLeft: 4 }}
            >
              {promo.usageCount} use{promo.usageCount !== 1 ? "s" : ""}
            </Tag>
          </Flex>
        ) 
        : (
          "Usage History"
        )
      }
      width={760}
      styles={{ body: { paddingTop: 16 } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin />
        </div>
      ) 
      : usage.length === 0 ? (
        <Empty
          description="This promo hasn't been used on any sales yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: "32px 0" }}
        />
      ) 
      : (
        <Table
          columns={columns}
          dataSource={usage}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          style={{ fontSize: 13 }}
        />
      )}
    </Modal>
  );
}

export default PromoUsageModal;
