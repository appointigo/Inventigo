"use client";

import { useRouter, useParams } from "next/navigation";
import { Card, Table, Tag, Button, Typography, Spin, Flex, theme, Row, Col, Statistic, Descriptions, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { OrgDetail } from "@/modules/admin/types";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import type { Role } from "@prisma/client";

const { Title, Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE: "default",
  PRO: "blue",
  ENTERPRISE: "gold",
};

const AdminOrgDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { token } = theme.useToken();

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ["platform-org", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${params.id}`);
      if (res.status === 404) throw new Error("Not found");
      if (!res.ok) throw new Error("Failed to load organization");
      return res.json();
    },
  });

  const userColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: OrgDetail["users"][0]) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: Role) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
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
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  const storeColumns = [
    { 
        title: "Name", 
        dataIndex: "name", 
        key: "name" 
    },
    { 
        title: "Code", 
        dataIndex: "code", 
        key: "code", 
        render: (c: string) => <Text code>{c}</Text> 
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Flex align="center" justify="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!org) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="secondary">Organization not found.</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: token.colorBgLayout, minHeight: "100vh" }}>
      <Flex align="center" gap={12} style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/organizations")}
        />
        <Title level={2} style={{ margin: 0 }}>
            {org.name}
        </Title>
        <Tag color={PLAN_COLORS[org.plan]}>
            {org.plan}
        </Tag>
        <Tag color={org.isActive ? "green" : "default"}>
            {org.isActive ? "Active" : "Inactive"}
        </Tag>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
            <Card>
                <Statistic title="Users" value={org.userCount} />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card>
                <Statistic title="Stores" value={org.storeCount} />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card>
                <Statistic title="Products" value={org.productCount} />
            </Card>
        </Col>
      </Row>

      <Card title="Details" style={{ marginBottom: 24 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="ID">
            <Text code copyable>{org.id}</Text>
        </Descriptions.Item>
          <Descriptions.Item label="Slug">
            <Text code>/{org.slug}</Text>
        </Descriptions.Item>
          <Descriptions.Item label="Plan">
            <Tag color={PLAN_COLORS[org.plan]}>{org.plan}</Tag>
        </Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(org.createdAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Users" style={{ marginBottom: 24 }}>
        <Table
          dataSource={org.users}
          columns={userColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="Stores">
        <Table
          dataSource={org.stores}
          columns={storeColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
}

export default AdminOrgDetailPage;