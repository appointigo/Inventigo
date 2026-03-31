"use client";

import { useRouter } from "next/navigation";
import { Card, Table, Tag, Button, Input, Space, Typography, Spin, Flex, theme } from "antd";
import { SearchOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { OrgSummary } from "@/modules/admin/types";

const { Title, Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE: "default",
  PRO: "blue",
  ENTERPRISE: "gold",
};

const AdminOrganizationsPage = () => {
  const router = useRouter();
  const { token } = theme.useToken();
  const [search, setSearch] = useState("");

  const { data: orgs = [], isLoading } = useQuery<OrgSummary[]>({
    queryKey: ["platform-orgs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/organizations");
      if (!res.ok) throw new Error("Failed to load organizations");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Organization",
      dataIndex: "name",
      key: "name",
      sorter: (a: OrgSummary, b: OrgSummary) => a.name.localeCompare(b.name),
      render: (name: string, record: OrgSummary) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>/{record.slug}</Text>
        </Space>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      filters: [
        { text: "FREE", value: "FREE" },
        { text: "PRO", value: "PRO" },
        { text: "ENTERPRISE", value: "ENTERPRISE" },
      ],
      onFilter: (value: unknown, record: OrgSummary) => record.plan === value,
      render: (plan: string) => <Tag color={PLAN_COLORS[plan]}>{plan}</Tag>,
    },
    { 
        title: "Stores", 
        dataIndex: "storeCount", 
        key: "storeCount", 
        sorter: (a: OrgSummary, b: OrgSummary) => a.storeCount - b.storeCount 
    },
    { 
        title: "Users",  
        dataIndex: "userCount",  
        key: "userCount",  
        sorter: (a: OrgSummary, b: OrgSummary) => a.userCount - b.userCount 
    },
    { 
        title: "Products", 
        dataIndex: "productCount", 
        key: "productCount", 
        sorter: (a: OrgSummary, b: OrgSummary) => a.productCount - b.productCount 
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: OrgSummary, b: OrgSummary) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "",
      key: "actions",
      render: (_: unknown, record: OrgSummary) => (
        <Button size="small" onClick={() => router.push(`/admin/organizations/${record.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        background: token.colorBgLayout,
        minHeight: "100vh",
      }}
    >
      <Flex align="center" gap={12} style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin")}
        />
        <Title level={2} style={{ margin: 0 }}>Organizations</Title>
      </Flex>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
            allowClear
          />
        </div>

        {isLoading ? (
          <Flex justify="center" style={{ padding: 40 }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        )}
      </Card>
    </div>
  );
}

export default AdminOrganizationsPage;