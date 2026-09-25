"use client";
import Link from "next/link";
import { CalendarOutlined, EditOutlined, EllipsisOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Dropdown, Empty, Space, Statistic, Tag, Typography } from "antd";
import type { CustomerDetailDto } from "../types";

type Props = {
  customer: CustomerDetailDto;
  fullProfileHref: string;
  onEdit: () => void;
  onRecordVisit: () => void;
  onCreateFollowUp: () => void;
};
const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value: string) =>
  value
    .toLocaleLowerCase("en-IN")
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());

export default function CustomerQuickView({
  customer,
  fullProfileHref,
  onEdit,
  onRecordVisit,
  onCreateFollowUp,
}: Props) {
  const latestPurchase = customer.sales[0];
  const latestDemand = customer.demandRequests[0];
  const groups = customer.groups.filter(
    (group) =>
      group.toLocaleLowerCase("en-IN") !== customer.activityStatus.toLocaleLowerCase("en-IN")
  );
  return (
    <div style={{ padding: 16 }}>
      <Space align="start" size={12}>
        <Avatar size={48} style={{ background: "#2563eb" }} icon={<UserOutlined />}>
          {customer.name?.slice(0, 1)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {customer.name || "Unnamed Customer"}
          </Typography.Title>
          <Typography.Text type="secondary">{customer.mobile}</Typography.Text>
          <div style={{ marginTop: 6 }}>
            <Tag
              color={
                customer.activityStatus === "Recently purchased"
                  ? "green"
                  : customer.activityStatus === "Past customer"
                    ? "orange"
                    : "default"
              }
            >
              {customer.activityStatus}
            </Tag>
            {groups.slice(0, 1).map((group) => (
              <Tag key={group}>{group}</Tag>
            ))}
            {groups.length > 1 ? <Tag>+{groups.length - 1}</Tag> : null}
          </div>
          {customer.preferredStoreName ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Preferred store: {customer.preferredStoreName}
            </Typography.Text>
          ) : null}
        </div>
      </Space>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 8,
          margin: "16px 0",
        }}
      >
        {[
          ["Total Spent", money(customer.totalSpent)],
          ["Orders", customer.totalVisits],
          [
            "Last Purchase",
            latestPurchase
              ? new Date(latestPurchase.createdAt).toLocaleDateString("en-IN")
              : "Never",
          ],
        ].map(([title, value]) => (
          <Card size="small" key={title}>
            <Statistic title={title} value={value} valueStyle={{ fontSize: 15, fontWeight: 700 }} />
          </Card>
        ))}
      </div>
      <Card size="small" title="Recent activity" style={{ marginBottom: 14 }}>
        {latestPurchase ? (
          <div>
            <Typography.Text strong>{latestPurchase.invoiceNumber}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                {new Date(latestPurchase.createdAt).toLocaleDateString("en-IN")} ·{" "}
                {money(latestPurchase.total)}
              </Typography.Text>
            </div>
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchases yet" />
        )}
        {latestDemand ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
            <Typography.Text strong>{latestDemand.requirement}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                Demand · {latestDemand.storeName} · {label(latestDemand.status)}
              </Typography.Text>
            </div>
          </div>
        ) : null}
      </Card>
      <Space wrap>
        <Button icon={<EditOutlined />} onClick={onEdit}>
          Edit
        </Button>
        <Button icon={<CalendarOutlined />} onClick={onRecordVisit}>
          Record Visit
        </Button>
        <Dropdown
          menu={{
            items: [{ key: "follow-up", label: "Create Follow-up", onClick: onCreateFollowUp }],
          }}
        >
          <Button aria-label="More customer actions" icon={<EllipsisOutlined />} />
        </Dropdown>
      </Space>
      <Link href={fullProfileHref} style={{ display: "block", marginTop: 12 }}>
        <Button type="primary" block>
          Open Full Profile
        </Button>
      </Link>
    </div>
  );
}
