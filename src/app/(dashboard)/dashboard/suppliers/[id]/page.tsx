"use client";

import { useParams, useRouter } from "next/navigation";
import { Typography, Button, Space, Spin, Table, Tag } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useSupplier } from "@/modules/suppliers/hooks/useSuppliers";
import SupplierDetail from "@/modules/suppliers/components/SupplierDetail";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from "@/shared/constants/statuses";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDate } from "@/shared/utils/formatDate";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrder } from "@/modules/purchase-orders/types";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { supplier, loading } = useSupplier(id);
  const { purchaseOrders, loading: posLoading } = usePurchaseOrders({ supplierId: id });

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">Supplier not found</Typography.Text>
      </div>
    );
  }

  const poColumns: ColumnsType<PurchaseOrder> = [
    {
      title: "PO #",
      dataIndex: "id",
      render: (id: string) => (
        <a onClick={() => router.push(`/dashboard/purchase-orders/${id}`)}>
          {id.slice(0, 8)}...
        </a>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: PurchaseOrder["status"]) => (
        <Tag color={PO_STATUS_COLORS[status]}>{PO_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      render: (val: number) => formatCurrency(val),
    },
    {
      title: "Items",
      dataIndex: "itemCount",
      align: "center",
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      render: (val: string) => formatDate(val),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard/suppliers")}>
          Back to Suppliers
        </Button>
      </Space>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        {supplier.name}
      </Typography.Title>

      <SupplierDetail supplier={supplier} />

      <Typography.Title level={4} style={{ marginTop: 32, marginBottom: 16 }}>
        Purchase Order History
      </Typography.Title>
      <Table
        columns={poColumns}
        dataSource={purchaseOrders}
        rowKey="id"
        loading={posLoading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "No purchase orders yet" }}
      />
    </div>
  );
}
