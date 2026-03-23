"use client";

import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Dropdown, Avatar, Space, Spin, Typography, theme, Flex, Tooltip } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { getMenuForRole } from "@/modules/layout/constants";
import { Role } from "@prisma/client";
import StoreSelector from "@/modules/settings/components/StoreSelector";
import { type ReactNode, useState, useEffect } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const DEV_USER = {
  id: "dev",
  name: "Dev User",
  email: "dev@inventigo.com",
  role: "ADMIN" as Role,
  storeId: null,
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { token } = theme.useToken();

  useEffect(() => {
    setMounted(true);
  }, []);

  // In dev mode without DB, use a mock admin user so the layout renders
  const isDev = process.env.NODE_ENV === "development";
  const currentUser = user ?? (isDev ? DEV_USER : null);

  // Wait for client mount to avoid ProLayout hydration mismatch
  // (ProLayout reads window.innerWidth for responsive classes)
  if (!mounted || (isLoading && !isDev)) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </Flex>
    );
  }

  const role = currentUser?.role ?? ("ADMIN" as Role);
  const menuItems = getMenuForRole(role).map((item) => ({
    key: item.path,
    icon: <item.icon />,
    label: item.name,
  }));

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: "#001529", position: "relative", overflow: "hidden" }}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        <Flex
          align="center"
          justify={collapsed ? "center" : "space-between"}
          style={{
            height: 56,
            padding: collapsed ? 0 : "0 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Text
            strong
            style={{ color: "#fff", fontSize: collapsed ? 14 : 18, whiteSpace: "nowrap" }}
          >
            {collapsed ? "I" : "Inventigo"}
          </Text>
        </Flex>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0 }}
        />
        <Tooltip title={collapsed ? "Expand" : "Collapse"} placement="right" destroyOnHidden>
          <Flex
            align="center"
            justify="center"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 6,  
              cursor: "pointer",
              color: "rgba(255,255,255,0.65)",
              fontSize: 20,
              transition: "all 0.2s",
              background: "rgba(255,255,255,0.04)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </Flex>
        </Tooltip>
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            lineHeight: "56px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {currentUser?.role === Role.ADMIN ? <StoreSelector /> : <div />}

          <Dropdown
            menu={{
              items: [
                {
                  key: "info",
                  label: (
                    <div style={{ padding: "4px 0" }}>
                      <div>
                        <Text strong>{currentUser?.name}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {currentUser?.email}
                      </Text>
                      <br />
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, textTransform: "uppercase" }}
                      >
                        {currentUser?.role}
                      </Text>
                    </div>
                  ),
                  disabled: true,
                },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Sign Out",
                  onClick: logout,
                },
              ],
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: "pointer" }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{currentUser?.name ?? "User"}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 0,
            padding: 0,
            background: token.colorBgLayout,
            overflow: "auto",
            height: "calc(100vh - 56px)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
