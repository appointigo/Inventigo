"use client";

import { Descriptions, Tag, Table, Card, Steps, Flex } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrder, POItem } from "../types";
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from "@/shared/constants/statuses";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/shared/utils/formatDate";

interface PODetailProps {
  purchaseOrder: PurchaseOrder;
}

export default function PODetail({ purchaseOrder }: PODetailProps) {
  const { status, orderedAt, receivedAt, createdAt } = purchaseOrder;

  // Determine current step for the timeline
  let currentStep = 0;
  if (status === "CANCELLED") {
    currentStep = status === "CANCELLED" ? -1 : 0; // Special handling below
  } else if (status === "ORDERED") {
    currentStep = 1;
  } else if (status === "RECEIVED") {
    currentStep = 2;
  }

  const itemColumns: ColumnsType<POItem> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          <div style={{ color: "#888", fontSize: 12 }}>{record.productSku}</div>
        </div>
      ),
    },
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 80,
      align: "center",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 100,
      align: "center",
    },
    {
      title: "Unit Cost",
      dataIndex: "unitCost",
      width: 120,
      align: "right",
      render: (val: number) => formatCurrency(val),
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 130,
      align: "right",
      render: (val: number) => formatCurrency(val),
    },
  ];

  return (
    <Flex vertical gap={24}>
      {/* Status Timeline */}
      {status !== "CANCELLED" ? (
        <Card size="small">
          <Steps
            current={currentStep}
            size="small"
            items={[
              {
                title: "Draft",
                content: createdAt ? formatDate(createdAt) : undefined,
              },
              {
                title: "Ordered",
                content: orderedAt ? formatDate(orderedAt) : undefined,
              },
              {
                title: "Received",
                content: receivedAt ? formatDate(receivedAt) : undefined,
              },
            ]}
          />
        </Card>
      ) : (
        <Card size="small">
          <Tag color="error" style={{ fontSize: 14, padding: "4px 12px" }}>
            Cancelled
          </Tag>
        </Card>
      )}

      {/* Order Info */}
      <Card title="Order Information" size="small">
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="PO Number">
            {purchaseOrder.id.slice(0, 8).toUpperCase()}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={PO_STATUS_COLORS[status]}>{PO_STATUS_LABELS[status]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Supplier">
            {purchaseOrder.supplierName}
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {purchaseOrder.createdByName}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <strong>{formatCurrency(purchaseOrder.totalAmount)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {formatDateTime(purchaseOrder.createdAt)}
          </Descriptions.Item>
          {purchaseOrder.notes && (
            <Descriptions.Item label="Notes" span={2}>
              {purchaseOrder.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Line Items */}
      <Card title={`Line Items (${purchaseOrder.items.length})`} size="small">
        <Table
          columns={itemColumns}
          dataSource={purchaseOrder.items}
          rowKey="id"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong>Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{formatCurrency(purchaseOrder.totalAmount)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </Flex>
  );
}
