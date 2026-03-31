"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Menu, Typography, Spin, Flex, Card, Statistic, Row, Col, Table, Tag, Avatar, Space, Button, theme, Dropdown } from "antd";
import { DashboardOutlined, ApartmentOutlined, UserOutlined, LogoutOutlined, AppstoreOutlined } from "@ant-design/icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { PlatformStats, OrgSummary } from "@/modules/admin/types";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE: "default",
  PRO: "blue",
  ENTERPRISE: "gold",
};

const ADMIN_MENU = [
  { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/admin/organizations", icon: <ApartmentOutlined />, label: "Organizations" },
];

const AdminDashboardPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { token } = theme.useToken();

  // Guard: only SUPER_ADMIN
  useEffect(() => {
    if (!isLoading && user && user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    refetchInterval: 30_000, // 30-second polling
    enabled: user?.role === "SUPER_ADMIN",
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery<OrgSummary[]>({
    queryKey: ["platform-orgs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/organizations");
      if (!res.ok) throw new Error("Failed to load organizations");
      return res.json();
    },
    refetchInterval: 30_000,
    enabled: user?.role === "SUPER_ADMIN",
  });

  if (isLoading || (!user && !isLoading)) {
    return (
      <Flex align="center" justify="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const orgColumns = [
    {
      title: "Organization",
      dataIndex: "name",
      key: "name",
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
      render: (plan: string) => <Tag color={PLAN_COLORS[plan]}>{plan}</Tag>,
    },
    {
      title: "Stores",
      dataIndex: "storeCount",
      key: "storeCount",
    },
    {
      title: "Users",
      dataIndex: "userCount",
      key: "userCount",
    },
    {
      title: "Products",
      dataIndex: "productCount",
      key: "productCount",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{
            isActive ? "Active" : "Inactive"}
        </Tag>
      ),
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
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sider width={220} style={{ background: "#001529" }}>
        <Flex
          align="center"
          style={{
            height: 56,
            padding: "0 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <AppstoreOutlined style={{ color: "#fff", marginRight: 8 }} />
          <Text strong style={{ color: "#fff", fontSize: 16 }}>
            Platform Admin
          </Text>
        </Flex>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={ADMIN_MENU}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Stockiva Platform
          </Text>

          <Dropdown
            menu={{
              items: [
                {
                  key: "info",
                  label: (
                    <div style={{ padding: "4px 0" }}>
                      <div><Text strong>{user?.name}</Text></div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
                      <br />
                      <Tag color="volcano" style={{ marginTop: 4, fontSize: 10 }}>SUPER_ADMIN</Tag>
                    </div>
                  ),
                  disabled: true,
                },
                { type: "divider" },
                { key: "logout", icon: <LogoutOutlined />, label: "Sign Out", onClick: logout },
              ],
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: "pointer" }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{user?.name ?? "Admin"}</Text>
            </Space>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
            overflow: "auto",
            height: "calc(100vh - 56px)",
          }}
        >
          <Title level={2} style={{ marginBottom: 24 }}>Platform Dashboard</Title>

          {/* KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Organizations"
                  value={statsLoading ? "—" : stats?.totalOrgs}
                  prefix={<ApartmentOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Users"
                  value={statsLoading ? "—" : stats?.totalUsers}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Stores"
                  value={statsLoading ? "—" : stats?.totalStores}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="New Orgs This Month"
                  value={statsLoading ? "—" : stats?.newOrgsThisMonth}
                />
              </Card>
            </Col>
          </Row>

          {/* Organizations Table */}
          <Card
            title="Organizations"
            extra={
              <Button size="small" onClick={() => router.push("/admin/organizations")}>
                View All
              </Button>
            }
          >
            <Table
              dataSource={orgs.slice(0, 10)}
              columns={orgColumns}
              rowKey="id"
              loading={orgsLoading}
              pagination={false}
              size="small"
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminDashboardPage;