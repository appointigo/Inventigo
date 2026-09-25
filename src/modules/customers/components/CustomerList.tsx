"use client";
import { PlusOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Input, Space, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CustomerListItemDto, CustomerListType } from "../types";
type Props = { customers: CustomerListItemDto[]; loading: boolean; total: number; page: number; pageSize: number; search: string; activeType: CustomerListType; selectedCustomerId?: string | null; onSearchChange: (value: string) => void; onTypeChange: (type: CustomerListType) => void; onPageChange: (page: number, pageSize: number) => void; onSelectCustomer: (id: string) => void; onCreateCustomer: () => void };
const segmentColor: Record<string, string> = { Recent: "blue", Repeat: "purple", "High Value": "gold", "At Risk": "red", Lead: "cyan", Inactive: "default" };
const statusColor: Record<string, string> = { Active: "green", Cooling: "orange", Inactive: "red" };
export default function CustomerList(props: Props) {
  const columns: ColumnsType<CustomerListItemDto> = [
    { title: "Customer", dataIndex: "name", fixed: "left", width: 210, render: (name, row) => <Space><Avatar style={{ background: "#e8f1ff", color: "#2563eb" }} icon={!name ? <UserOutlined /> : undefined}>{name?.slice(0, 1).toUpperCase()}</Avatar><div><Typography.Text strong>{name || "Unnamed Customer"}</Typography.Text><div><Typography.Text type="secondary" style={{ fontSize: 11 }}>#{row.id.slice(0, 8)}</Typography.Text></div></div></Space> },
    { title: "Mobile", dataIndex: "mobile", width: 132 },
    { title: "Total Spent", dataIndex: "totalSpent", width: 125, align: "right", render: value => `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
    { title: "Orders", dataIndex: "totalVisits", width: 82, align: "center" },
    { title: "Last Purchase", dataIndex: "lastPurchaseAt", width: 126, render: value => value ? new Date(value).toLocaleDateString("en-IN") : "Never" },
    { title: "Preferred Store", dataIndex: "preferredStoreName", width: 145, render: value => value || <Typography.Text type="secondary">Unassigned</Typography.Text> },
    { title: "Segment", dataIndex: "segment", width: 112, render: value => <Tag color={segmentColor[value]}>{value}</Tag> },
    { title: "Status", dataIndex: "relationshipStatus", width: 105, render: value => <Tag color={statusColor[value]}>{value}</Tag> },
  ];
  return <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(15,23,42,.05)" }}>
    <div style={{ padding: "16px 18px 0" }}><Typography.Title level={5} style={{ margin: 0 }}>Customer directory</Typography.Title><Tabs activeKey={props.activeType} items={[{ key: "all", label: "All" }, { key: "recent", label: "Recent" }, { key: "high_spenders", label: "High Spenders" }, { key: "inactive", label: "Inactive" }]} onChange={key => props.onTypeChange(key as CustomerListType)} /></div>
    <Space style={{ width: "100%", justifyContent: "space-between", padding: "0 18px 16px" }} wrap><Input value={props.search} onChange={event => props.onSearchChange(event.target.value)} prefix={<SearchOutlined />} placeholder="Search name or mobile" allowClear style={{ width: 300 }} /><Button type="primary" icon={<PlusOutlined />} onClick={props.onCreateCustomer}>Add Customer</Button></Space>
    <Table rowKey="id" size="middle" columns={columns} dataSource={props.customers} loading={props.loading} scroll={{ x: 1050 }} onRow={row => ({ onClick: () => props.onSelectCustomer(row.id), style: { cursor: "pointer", background: row.id === props.selectedCustomerId ? "#f0f6ff" : undefined } })} pagination={{ current: props.page, pageSize: props.pageSize, total: props.total, showSizeChanger: true, showTotal: count => `${count} customers`, onChange: props.onPageChange }} />
  </Card>;
}
