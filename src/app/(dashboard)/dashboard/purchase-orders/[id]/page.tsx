"use client";

import { useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Typography, Button, Space, Spin, Popconfirm, App, Flex, Input, Modal } from "antd";
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PODetailComponent from "@/modules/purchase-orders/components/PODetail";
import POReceiveForm from "@/modules/purchase-orders/components/POReceiveForm";
import { usePurchaseOrder } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import type { ReceivePOInput } from "@/modules/purchase-orders/types";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { purchaseOrder, loading, refresh } = usePurchaseOrder(id);
  const [showReceive, setShowReceive] = useState(() => searchParams.get("receive") === "1");
  const [actionLoading, setActionLoading] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const actionInFlight = useRef(false);

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
    if (actionInFlight.current) return;
    actionInFlight.current = true;
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
      actionInFlight.current = false;
      setActionLoading(false);
    }
  };

  const handleReceive = async (input: ReceivePOInput) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": input.confirmationId },
        body: JSON.stringify(input),
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
      actionInFlight.current = false;
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
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
      actionInFlight.current = false;
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!closeReason.trim()) {
      message.error("Enter a reason for closing the remaining quantity");
      return;
    }
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${encodeURIComponent(id)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: closeReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to close purchase order");
        return;
      }
      message.success("Remaining purchase quantity closed without changing stock");
      setShowClose(false);
      setCloseReason("");
      refresh();
    } finally {
      actionInFlight.current = false;
      setActionLoading(false);
    }
  };

  const { status } = purchaseOrder;
  const hasReceiptEvidence = purchaseOrder.items.some(
    (item) => item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity > 0,
  );

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
                <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>Cancel</Button>
              </Popconfirm>
            </>
          )}
          {(status === "ORDERED" || status === "PARTIALLY_RECEIVED") && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setShowReceive(true)}
                loading={actionLoading}
              >
                Receive
              </Button>
              {hasReceiptEvidence ? (
                <Button danger icon={<CloseCircleOutlined />} onClick={() => setShowClose(true)} loading={actionLoading}>
                  Close Remaining
                </Button>
              ) : (
                <Popconfirm
                  title="Cancel this purchase order?"
                  onConfirm={handleCancel}
                  okText="Cancel PO"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>Cancel</Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      </Flex>

      <Modal
        title="Close remaining purchase quantity"
        open={showClose}
        onOk={handleClose}
        onCancel={() => setShowClose(false)}
        confirmLoading={actionLoading}
        okText="Close Remaining"
        okButtonProps={{ danger: true }}
      >
        <Typography.Paragraph>
          Posted receipts and stock movements will be preserved. The outstanding quantity will no longer be treated as inbound.
        </Typography.Paragraph>
        <Input.TextArea
          value={closeReason}
          onChange={(event) => setCloseReason(event.target.value)}
          placeholder="Reason for short-closing this order"
          maxLength={1000}
          rows={3}
        />
      </Modal>

      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Purchase Order: {purchaseOrder.poNumber}
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
