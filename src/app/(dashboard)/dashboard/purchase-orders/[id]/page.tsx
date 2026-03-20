"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Typography, Button, Space, Spin, Popconfirm, App, Flex } from "antd";
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PODetailComponent from "@/modules/purchase-orders/components/PODetail";
import POReceiveForm from "@/modules/purchase-orders/components/POReceiveForm";
import { usePurchaseOrder } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import type { ReceiveItemInput } from "@/modules/purchase-orders/types";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { purchaseOrder, loading, refresh } = usePurchaseOrder(id);
  const [showReceive, setShowReceive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">Purchase order not found</Typography.Text>
      </div>
    );
  }

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to submit");
        return;
      }
      message.success("Purchase order submitted — status changed to Ordered");
      refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async (items: ReceiveItemInput[]) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to receive");
        return;
      }
      message.success("Purchase order received — stock updated");
      setShowReceive(false);
      refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to cancel");
        return;
      }
      message.success("Purchase order cancelled");
      refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const { status } = purchaseOrder;

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" gap={8} wrap style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/purchase-orders")}
        >
          Back to Purchase Orders
        </Button>
        <Space>
          {status === "DRAFT" && (
            <>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={actionLoading}
              >
                Submit Order
              </Button>
              <Popconfirm
                title="Cancel this purchase order?"
                onConfirm={handleCancel}
                okText="Cancel PO"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                  Cancel
                </Button>
              </Popconfirm>
            </>
          )}
          {status === "ORDERED" && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setShowReceive(true)}
                loading={actionLoading}
              >
                Receive
              </Button>
              <Popconfirm
                title="Cancel this purchase order?"
                onConfirm={handleCancel}
                okText="Cancel PO"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                  Cancel
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </Flex>

      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Purchase Order: {id.slice(0, 8).toUpperCase()}
      </Typography.Title>

      {showReceive ? (
        <POReceiveForm
          purchaseOrder={purchaseOrder}
          onReceive={handleReceive}
          onCancel={() => setShowReceive(false)}
          loading={actionLoading}
        />
      ) : (
        <PODetailComponent purchaseOrder={purchaseOrder} />
      )}
    </div>
  );
}
