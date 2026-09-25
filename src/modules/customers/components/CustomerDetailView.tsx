"use client";
import { CalendarOutlined, EditOutlined, FlagOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  List,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CustomerDetailDto, CustomerSaleSummaryDto } from "../types";
type Props = {
  customer: CustomerDetailDto | null;
  loading: boolean;
  onEdit: () => void;
  onRecordVisit: () => void;
  onCreateFollowUp: () => void;
  onFollowUpUpdated: () => void;
  activeTab?: string;
  onActiveTabChange?: (key: string) => void;
};
const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plainLabel = (value: string) =>
  value
    .toLocaleLowerCase("en-IN")
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
const InsightBlock = ({ title, values }: { title: string; values: string[] }) => (
  <Card size="small" title={title} style={{ height: "100%" }}>
    {values.length ? (
      <Space wrap>
        {values.map((value) => (
          <Tag key={value}>{value}</Tag>
        ))}
      </Space>
    ) : (
      <Typography.Text type="secondary">No sufficient data</Typography.Text>
    )}
  </Card>
);
export default function CustomerDetailView({
  customer,
  loading,
  onEdit,
  onRecordVisit,
  onCreateFollowUp,
  onFollowUpUpdated,
  activeTab = "overview",
  onActiveTabChange,
}: Props) {
  if (!customer)
    return (
      <Card loading={loading} style={{ borderRadius: 14 }}>
        <Empty description="Select a customer to view their profile" />
      </Card>
    );
  const lastPurchase = customer.sales[0]?.createdAt ?? null;
  const salesColumns: ColumnsType<CustomerSaleSummaryDto> = [
    { title: "Invoice", dataIndex: "invoiceNumber" },
    { title: "Store", dataIndex: "storeName" },
    {
      title: "Items",
      dataIndex: "items",
      render: (items: CustomerSaleSummaryDto["items"]) =>
        items
          .map((item) => `${item.name}${item.size ? ` (${item.size})` : ""} ×${item.quantity}`)
          .join(", ") || "—",
    },
    { title: "Amount", dataIndex: "total", align: "right", render: money },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={value === "COMPLETED" ? "green" : "orange"}>{value}</Tag>,
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      render: (value) => <Tag>{plainLabel(value)}</Tag>,
    },
    {
      title: "Return / exchange",
      dataIndex: "returnStatus",
      render: (value) => (value === "NONE" ? "—" : <Tag color="orange">{plainLabel(value)}</Tag>),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      render: (value) => new Date(value).toLocaleDateString("en-IN"),
    },
  ];
  const overview = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="Basic information">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Name">{customer.name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{customer.mobile}</Descriptions.Item>
          {customer.email ? (
            <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
          ) : null}
          {customer.dateOfBirth ? (
            <Descriptions.Item label="Birthday">
              {new Date(customer.dateOfBirth).toLocaleDateString("en-IN")}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label="Preferred store">
            {customer.preferredStoreName || "Not assigned"}
          </Descriptions.Item>
          <Descriptions.Item label="First purchase">
            {customer.firstPurchaseDate
              ? new Date(customer.firstPurchaseDate).toLocaleDateString("en-IN")
              : "Never"}
          </Descriptions.Item>
          <Descriptions.Item label="Last recorded visit">
            {customer.lastVisitAt
              ? new Date(customer.lastVisitAt).toLocaleString("en-IN")
              : "Not recorded"}
          </Descriptions.Item>
          {customer.tags.length ? (
            <Descriptions.Item label="Tags">
              {customer.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Descriptions.Item>
          ) : null}
          {customer.notes ? (
            <Descriptions.Item label="Notes">{customer.notes}</Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>
      <Typography.Title level={5} style={{ margin: 0 }}>
        Shopping insights
      </Typography.Title>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 10,
        }}
      >
        <InsightBlock title="Top purchased categories" values={customer.insights.topCategories} />
        <InsightBlock title="Common purchased sizes" values={customer.insights.commonSizes} />
        <InsightBlock
          title="Frequently purchased brands"
          values={customer.insights.preferredBrands}
        />
      </div>
      <Card
        size="small"
        title="Recent Unfulfilled Demand"
        extra={
          customer.demandRequests.length ? (
            <Button type="link" size="small" onClick={() => onActiveTabChange?.("demand")}>
              View All
            </Button>
          ) : null
        }
      >
        {customer.demandRequests.length ? (
          <List
            size="small"
            dataSource={customer.demandRequests.slice(0, 3)}
            renderItem={(item) => (
              <List.Item extra={<Tag>{plainLabel(item.status)}</Tag>}>
                <List.Item.Meta
                  title={item.requirement}
                  description={`${plainLabel(item.reason)} · ${item.storeName} · ${new Date(item.createdAt).toLocaleDateString("en-IN")}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No unfulfilled requests recorded"
          />
        )}
      </Card>
    </Space>
  );
  const updateFollowUp = async (id: string, status: string) => {
    const response = await fetch(`/api/customer-follow-ups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) onFollowUpUpdated();
  };
  const tabs = [
    { key: "overview", label: "Overview", children: overview },
    {
      key: "purchases",
      label: "Purchase History",
      children: (
        <Table
          rowKey="id"
          size="small"
          columns={salesColumns}
          dataSource={customer.sales}
          pagination={{ pageSize: 5 }}
        />
      ),
    },
    {
      key: "preferences",
      label: "Preferences",
      children: (
        <div style={{ display: "grid", gap: 12 }}>
          <Typography.Text type="secondary">
            Observed buying patterns derived from this customer&apos;s recorded purchases. No
            unconfirmed preferences are inferred.
          </Typography.Text>
          <InsightBlock title="Top purchased categories" values={customer.insights.topCategories} />
          <InsightBlock title="Common purchased sizes" values={customer.insights.commonSizes} />
          <InsightBlock
            title="Frequently purchased brands"
            values={customer.insights.preferredBrands}
          />
        </div>
      ),
    },
    {
      key: "demand",
      label: "Demand",
      children: customer.demandRequests.length ? (
        <List
          dataSource={customer.demandRequests}
          renderItem={(item) => (
            <List.Item
              extra={
                <Space>
                  <Tag>{plainLabel(item.status)}</Tag>
                  {item.followUpStatus ? (
                    <Tag color="blue">{plainLabel(item.followUpStatus)}</Tag>
                  ) : null}
                  {item.restockAvailable ? (
                    <Tag color="green">Available at {item.storeName}</Tag>
                  ) : null}
                </Space>
              }
            >
              <List.Item.Meta
                title={item.requirement}
                description={`${new Date(item.createdAt).toLocaleDateString("en-IN")} · ${item.storeName} · ${item.fulfilledQuantity}/${item.requestedQuantity} fulfilled · ${plainLabel(item.reason)}${
                  Object.keys(item.attributes).length
                    ? ` · ${Object.entries(item.attributes)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(", ")}`
                    : ""
                }`}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No demand requests recorded" />
      ),
    },
    {
      key: "engagement",
      label: "Engagement",
      children:
        customer.followUps.length || customer.visits.length ? (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Card size="small" title="Recorded visits">
              {customer.visits.length ? (
                <List
                  dataSource={customer.visits}
                  renderItem={(visit) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${plainLabel(visit.outcome)} · ${visit.storeName}`}
                        description={`${new Date(visit.visitedAt).toLocaleString("en-IN")}${visit.notes ? ` · ${visit.notes}` : ""}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No visits recorded" />
              )}
            </Card>
            <Card size="small" title="Follow-ups">
              {customer.followUps.length ? (
                <List
                  dataSource={customer.followUps}
                  renderItem={(item) => (
                    <List.Item
                      actions={
                        item.status === "OPEN"
                          ? [
                              <Button
                                size="small"
                                key="start"
                                onClick={() => updateFollowUp(item.id, "IN_PROGRESS")}
                              >
                                Start
                              </Button>,
                            ]
                          : item.status === "IN_PROGRESS"
                            ? [
                                <Button
                                  size="small"
                                  type="primary"
                                  key="complete"
                                  onClick={() => updateFollowUp(item.id, "COMPLETED")}
                                >
                                  Complete
                                </Button>,
                              ]
                            : item.status === "COMPLETED" || item.status === "CANCELLED"
                              ? [
                                  <Button
                                    size="small"
                                    key="reopen"
                                    onClick={() => updateFollowUp(item.id, "OPEN")}
                                  >
                                    Reopen
                                  </Button>,
                                ]
                              : []
                      }
                      extra={<Tag>{plainLabel(item.status)}</Tag>}
                    >
                      <List.Item.Meta
                        title={item.title}
                        description={`${plainLabel(item.type)} · ${plainLabel(item.priority)} · ${item.storeName}${item.assigneeName ? ` · ${item.assigneeName}` : ""}${item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleString("en-IN")}` : ""}${item.note ? ` · ${item.note}` : ""}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No follow-ups recorded" />
              )}
            </Card>
          </Space>
        ) : (
          <Empty description="No follow-ups recorded" />
        ),
    },
  ];
  return (
    <Card
      loading={loading}
      styles={{ body: { padding: 18 } }}
      style={{ borderRadius: 14, boxShadow: "0 8px 30px rgba(15,23,42,.05)", minWidth: 0 }}
    >
      <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
        <Space align="start">
          <Avatar size={56} style={{ background: "#2563eb" }} icon={<UserOutlined />}>
            {customer.name?.slice(0, 1)}
          </Avatar>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {customer.name || "Unnamed Customer"}
            </Typography.Title>
            <Typography.Text type="secondary">{customer.mobile}</Typography.Text>
            <Space wrap style={{ marginTop: 5 }}>
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
              {customer.groups
                .filter(
                  (group) =>
                    group.toLocaleLowerCase("en-IN") !==
                    customer.activityStatus.toLocaleLowerCase("en-IN")
                )
                .map((group) => (
                  <Tooltip key={group} title={`Customer group: ${group}`}>
                    <Tag
                      color={
                        group === "Need Attention"
                          ? "red"
                          : group === "High Spender"
                            ? "gold"
                            : "blue"
                      }
                    >
                      {group}
                    </Tag>
                  </Tooltip>
                ))}
              {customer.preferredStoreName ? <Tag>{customer.preferredStoreName}</Tag> : null}
              {customer.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
            <Tooltip title={`Internal customer ID: ${customer.id}`}>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Customer details
              </Typography.Text>
            </Tooltip>
          </div>
        </Space>
      </Space>
      <Space wrap style={{ margin: "16px 0" }}>
        <Button icon={<EditOutlined />} onClick={onEdit}>
          Edit Customer
        </Button>
        <Button icon={<CalendarOutlined />} onClick={onRecordVisit}>
          Record Visit
        </Button>
        <Button type="primary" icon={<FlagOutlined />} onClick={onCreateFollowUp}>
          Create Follow-up
        </Button>
      </Space>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          ["Total Spent", money(customer.totalSpent)],
          ["Total Orders", customer.totalVisits],
          ["Average Bill", customer.totalVisits ? money(customer.avgOrderValue) : "Not available"],
          [
            "Last Purchase",
            lastPurchase ? new Date(lastPurchase).toLocaleDateString("en-IN") : "Never",
          ],
        ].map(([title, value]) => (
          <Card size="small" key={title}>
            <Statistic title={title} value={value} valueStyle={{ fontSize: 16, fontWeight: 700 }} />
          </Card>
        ))}
      </div>
      <Tabs centered size="small" activeKey={activeTab} onChange={onActiveTabChange} items={tabs} />
    </Card>
  );
}
