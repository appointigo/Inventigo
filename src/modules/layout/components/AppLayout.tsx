"use client";

import { usePathname, useRouter } from "next/navigation";
import { ProLayout } from "@ant-design/pro-components";
import { Dropdown, Avatar, Space, Spin, Typography } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { MENU_ITEMS, getMenuForRole } from "@/modules/layout/constants";
import type { Role } from "@prisma/client";
import { type ReactNode, useState, useEffect } from "react";

const { Text } = Typography;

/**
 * Convert our MenuItem[] to ProLayout route format.
 */
function buildMenuRoutes(role: Role) {
  const items = getMenuForRole(role);
  return items.map((item) => ({
    path: item.path,
    name: item.name,
    icon: <item.icon />,
    children: item.children?.map((child) => ({
      path: child.path,
      name: child.name,
      icon: <child.icon />,
    })),
  }));
}

/**
 * Dev-mode mock user for when there's no database connection.
 */
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
  const [mounted, setMounted] = useState(false);

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
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const role = currentUser?.role ?? ("ADMIN" as Role);
  const menuRoutes = buildMenuRoutes(role);

  return (
    <ProLayout
      title="Inventigo"
      logo={null}
      layout="mix"
      fixSiderbar
      fixedHeader
      route={{
        path: "/dashboard",
        routes: menuRoutes,
      }}
      location={{ pathname }}
      token={{
        header: {
          colorBgHeader: "#fff",
          heightLayoutHeader: 56,
        },
        sider: {
          colorMenuBackground: "#001529",
          colorTextMenu: "rgba(255,255,255,0.75)",
          colorTextMenuSelected: "#fff",
          colorBgMenuItemSelected: "#1677ff",
          colorTextMenuActive: "#fff",
          colorBgMenuItemHover: "rgba(255,255,255,0.08)",
          colorTextMenuItemHover: "rgba(255,255,255,0.95)",
        },
      }}
      menuItemRender={(item, dom) => (
        <a
          onClick={(e) => {
            e.preventDefault();
            if (item.path) router.push(item.path);
          }}
        >
          {dom}
        </a>
      )}
      avatarProps={{
        icon: <UserOutlined />,
        size: "small",
        title: currentUser?.name ?? "User",
        render: (_props, dom) => (
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
            {dom}
          </Dropdown>
        ),
      }}
      // Breadcrumb from pathname
      headerTitleRender={(logo, title) => (
        <Space>
          {logo}
          {title}
        </Space>
      )}
    >
      <div style={{ minHeight: "calc(100vh - 56px)" }}>{children}</div>
    </ProLayout>
  );
}
