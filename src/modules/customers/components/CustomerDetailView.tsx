"use client";

import { Button, Card, Descriptions, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CustomerDetailDto, CustomerSaleSummaryDto } from "../types";

type CustomerDetailViewProps = {
  customer: CustomerDetailDto | null;
  loading: boolean;
  onEdit: () => void;
};

export default function CustomerDetailView({ customer, loading, onEdit }: CustomerDetailViewProps) {
  const salesColumns: ColumnsType<CustomerSaleSummaryDto> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      width: 170,
    },
    {
      title: "Amount",
      dataIndex: "total",
      width: 120,
      align: "right",
      render: (value: number) => `Rs ${value.toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status: string) => <Tag color={status === "COMPLETED" ? "green" : "orange"}>{status}</Tag>,
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      width: 130,
      render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
    },
  ];

  if (!customer) {
    return (
      <Card title="Customer Details" loading={loading}>
        <Empty description="Select a customer to view details" />
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="Customer Details"
        extra={<Button onClick={onEdit}>Edit</Button>}
        loading={loading}
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Name">{customer.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{customer.mobile}</Descriptions.Item>
          <Descriptions.Item label="Email">{customer.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString("en-IN") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Last Visit">
            {customer.lastVisitAt ? new Date(customer.lastVisitAt).toLocaleString("en-IN") : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Total Visits">{customer.totalVisits}</Descriptions.Item>
          <Descriptions.Item label="Avg Order Value">Rs {customer.avgOrderValue.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Status">{customer.isInactive ? "🔴 Inactive" : "🟢 Active"}</Descriptions.Item>
          <Descriptions.Item label="Total Spent">Rs {customer.totalSpent.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Notes">{customer.notes || "-"}</Descriptions.Item>
          <Descriptions.Item label="Tags">
            {customer.tags.length ? customer.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Dynamic Fields">
            {customer.metadata && Object.keys(customer.metadata).length ? (
              Object.entries(customer.metadata).map(([key, value]) => (
                <div key={key}>
                  <Typography.Text strong>{key}: </Typography.Text>
                  <Typography.Text>{String(value)}</Typography.Text>
                </div>
              ))
            ) : (
              "-"
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Recent Sales" loading={loading}>
        <Table<CustomerSaleSummaryDto>
          rowKey="id"
          size="small"
          columns={salesColumns}
          dataSource={customer.sales}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </Space>
  );
}
