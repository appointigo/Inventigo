"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Divider, Drawer, Dropdown, Flex, Layout, Space, Spin, Tag, theme, Tooltip, Typography } from "antd";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Role } from "@prisma/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import StoreSelector from "@/modules/settings/components/StoreSelector";
import { BottomNavigation } from "@/modules/mobile-dashboard/components/BottomNavigation";
import { MobileWorkspaceProvider } from "@/modules/mobile-dashboard/context/MobileWorkspaceContext";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { getPrimaryNavigation } from "../constants";
import GlobalCommandPalette from "./GlobalCommandPalette";
import ModuleNavigationBar from "./ModuleNavigationBar";
import NotificationPanel from "./NotificationPanel";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { token } = theme.useToken();
  const { isMobile } = useMobileViewport();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fetchedOrgName, setFetchedOrgName] = useState<string | null>(null);
  const orgFetched = useRef(false);

  useEffect(() => {
    if (orgFetched.current || !user?.orgId) return;
    if (user.orgName) return;
    orgFetched.current = true;
    fetch("/api/org/name")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.name) setFetchedOrgName(data.name); })
      .catch(() => undefined);
  }, [user?.orgId, user?.orgName]);

  const currentUser = user;

  useEffect(() => {
    if (currentUser?.role === Role.SUPER_ADMIN) router.replace("/admin");
  }, [currentUser, router]);

  if (isLoading || !currentUser || currentUser.role === Role.SUPER_ADMIN) {
    return <Flex align="center" justify="center" style={{ height: "100vh" }}><Spin size="large" /></Flex>;
  }

  const role = currentUser.role;
  const canSwitchStores = role === Role.OWNER || role === Role.ADMIN;
  const navigation = getPrimaryNavigation(role);
  const operationalNavigation = navigation.filter((item) => item.key !== "settings");
  const settingsNavigation = navigation.find((item) => item.key === "settings");
  const orgName = currentUser?.orgName ?? fetchedOrgName;

  const userMenu = {
    items: [
      {
        key: "info",
        disabled: true,
        label: (
          <div style={{ padding: "4px 2px", minWidth: 190 }}>
            <Text strong>{currentUser.name}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{currentUser.email}</Text></div>
            <Tag color={role === Role.OWNER ? "purple" : role === Role.ADMIN ? "blue" : "default"} style={{ marginTop: 7 }}>{role}</Tag>
          </div>
        ),
      },
      { type: "divider" as const },
      { key: "logout", icon: <LogoutOutlined />, label: "Sign out", onClick: logout },
    ],
  };

  const navigate = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  const navigationButton = (item: (typeof navigation)[number]) => {
    const Icon = item.icon;
    const active = item.match?.(pathname) ?? pathname.startsWith(item.path);
    const button = (
      <button key={item.key} type="button" className={`app-nav-item ${active ? "active" : ""}`} onClick={() => navigate(item.path)} aria-current={active ? "page" : undefined}>
        <Icon /><span>{item.name}</span>
      </button>
    );
    return collapsed ? <Tooltip key={item.key} title={item.name} placement="right">{button}</Tooltip> : button;
  };

  const sidebar = (
    <div className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button type="button" className="brand" onClick={() => navigate("/dashboard")} aria-label="Stockiva dashboard">
        <span className="brand-mark">S</span>
        <span className="brand-copy"><strong>Stockiva</strong>{orgName ? <small>{orgName}</small> : null}</span>
      </button>
      <nav className="app-nav" aria-label="Business areas">
        {operationalNavigation.map(navigationButton)}
      </nav>
      <div className="app-nav-footer">
        {settingsNavigation ? navigationButton(settingsNavigation) : null}
        {!isMobile ? (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <button type="button" className="app-nav-item collapse-button" onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}<span>Collapse</span>
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );

  const topbar = (
    <Header className="app-topbar">
      <div className="topbar-leading">
        {isMobile ? <button type="button" className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><MenuOutlined /></button> : null}
        <GlobalCommandPalette role={role} />
      </div>
      <Space size={12} align="center">
        {canSwitchStores ? <StoreSelector /> : null}
        <NotificationPanel />
        <Divider orientation="vertical" style={{ height: 24, margin: 0 }} />
        <Dropdown menu={userMenu} placement="bottomRight">
          <button type="button" className="profile-trigger">
            <Avatar size={30} icon={<UserOutlined />} style={{ background: "#e8f1ff", color: "#2563eb" }} />
            {!isMobile ? <span>{currentUser.name ?? "User"}</span> : null}
          </button>
        </Dropdown>
      </Space>
    </Header>
  );

  return (
    <MobileWorkspaceProvider>
      <Layout className="app-shell">
        {!isMobile ? <Sider trigger={null} collapsible collapsed={collapsed} collapsedWidth={76} width={236} theme="light">{sidebar}</Sider> : null}
        <Drawer placement="left" size={276} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} styles={{ body: { padding: 0 } }} closeIcon={false}>{sidebar}</Drawer>
        <Layout className="app-main">
          {topbar}
          <ModuleNavigationBar role={role} />
          <Content className={`app-content ${pathname === "/dashboard/billing" ? "billing-content" : ""}`}>{children}</Content>
        </Layout>
        {isMobile ? <BottomNavigation /> : null}
      </Layout>
      <style jsx global>{`
        .app-shell { min-height: 100dvh; height: 100dvh; overflow: hidden; background: #f6f8fb; }
        .app-shell .ant-layout-sider { border-right: 1px solid #e7ebf0; background: #fff !important; }
        .app-sidebar { height: 100%; display: flex; flex-direction: column; padding: 0 12px 12px; background: #fff; }
        .brand { height: 68px; width: 100%; border: 0; background: transparent; display: flex; align-items: center; gap: 11px; padding: 0 8px; cursor: pointer; color: #0f172a; text-align: left; }
        .brand-mark { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #fff; background: #2563eb; font-size: 17px; font-weight: 750; box-shadow: 0 5px 14px rgba(37, 99, 235, .2); }
        .brand-copy { min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
        .brand-copy strong { font-size: 17px; letter-spacing: -.25px; }
        .brand-copy small { margin-top: 3px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 154px; }
        .app-nav { display: flex; flex: 1; flex-direction: column; gap: 4px; padding-top: 12px; overflow-y: auto; }
        .app-nav-footer { border-top: 1px solid #eef1f5; padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
        .app-nav-item { position: relative; width: 100%; min-height: 42px; border: 0; border-radius: 9px; background: transparent; color: #526175; display: flex; align-items: center; gap: 12px; padding: 0 12px; cursor: pointer; font: inherit; font-weight: 500; text-align: left; transition: background .16s ease, color .16s ease; }
        .app-nav-item:hover { background: #f5f7fa; color: #1e40af; }
        .app-nav-item.active { background: #edf4ff; color: #2563eb; font-weight: 650; }
        .app-nav-item.active::before { content: ""; position: absolute; left: -12px; width: 3px; height: 22px; border-radius: 0 4px 4px 0; background: #2563eb; }
        .app-nav-item .anticon { font-size: 18px; flex: 0 0 auto; }
        .collapse-button { color: #8491a3; }
        .app-sidebar.collapsed { padding-inline: 10px; }
        .app-sidebar.collapsed .brand { justify-content: center; padding: 0; }
        .app-sidebar.collapsed .brand-copy, .app-sidebar.collapsed .app-nav-item span { display: none; }
        .app-sidebar.collapsed .app-nav-item { justify-content: center; padding: 0; }
        .app-sidebar.collapsed .app-nav-item.active::before { left: -10px; }
        .app-main { min-width: 0; min-height: 0; overflow: hidden; background: #f6f8fb; }
        .app-topbar { height: 60px; line-height: normal; flex: 0 0 auto; padding: 0 24px; border-bottom: 1px solid #e7ebf0; background: rgba(255,255,255,.96); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .topbar-leading { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .mobile-menu-trigger, .profile-trigger { border: 0; background: transparent; cursor: pointer; }
        .mobile-menu-trigger { width: 38px; height: 38px; border-radius: 8px; color: #475569; font-size: 18px; }
        .profile-trigger { display: flex; align-items: center; gap: 8px; color: ${token.colorText}; font: inherit; padding: 3px 0; }
        .app-content { flex: 1; min-height: 0; min-width: 0; overflow: auto; background: #f6f8fb; }
        .app-content.billing-content { overflow: hidden; }
        @media (max-width: 800px) {
          .app-topbar { padding: 0 14px; height: 58px; gap: 8px; }
          .app-topbar .ant-space-item:first-child:has(.ant-select) { display: none; }
          .app-content { padding-bottom: 86px; }
          .app-content.billing-content { overflow: auto; }
          .app-sidebar { min-height: 100dvh; }
        }
      `}</style>
    </MobileWorkspaceProvider>
  );
}
