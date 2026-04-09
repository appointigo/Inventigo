"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin, Flex, Tooltip } from "antd";
import { AppstoreOutlined, LogoutOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useThemeMode } from "@/providers/ThemeProvider";
import { ADMIN_NAV_SECTIONS, ADMIN_BREADCRUMBS } from "../../constants";
import {
  AdminShell,
  Sidebar,
  SidebarBrand,
  BrandIcon,
  BrandTextWrap,
  BrandName,
  BrandBadge,
  NavSectionLabel,
  NavItem,
  NavIcon,
  NavBadge,
  SidebarFooter,
  FooterProfile,
  FooterAvatar,
  FooterTextWrap,
  FooterName,
  FooterRole,
  FooterActions,
  FooterIconBtn,
  SignOutBtn,
  MainArea,
  TopBar,
  Breadcrumb,
  BreadcrumbCurrent,
  TopBarSpacer,
  TopBarChip,
  LiveDot,
  ContentArea,
} from "./PlatformAdminLayout.styled";

interface Props {
  children: React.ReactNode;
}

const PlatformAdminLayout = ({ children }: Props) => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { mode, setMode } = useThemeMode();

  const isDark = mode === "dark";

  // Auth guard: non-super-admin → redirect to dashboard
  React.useEffect(() => {
    if (!isLoading && user?.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const breadcrumb = useMemo(
    () => ADMIN_BREADCRUMBS[pathname] ?? "Admin",
    [pathname]
  );

  const handleNavClick = useCallback(
    (key: string, disabled?: boolean) => {
      if (disabled) return;
      router.push(key);
    },
    [router]
  );

  const avatarLetter = useMemo(
    () => (user?.name?.[0] ?? "A").toUpperCase(),
    [user?.name]
  );

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  if (isLoading || !user) {
    return (
      <Flex align="center" justify="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <AdminShell>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <Sidebar>
        <SidebarBrand>
          <BrandIcon>
            <AppstoreOutlined />
          </BrandIcon>
          <BrandTextWrap>
            <BrandName>Stockiva</BrandName>
            <BrandBadge>PLATFORM ADMIN</BrandBadge>
          </BrandTextWrap>
        </SidebarBrand>

        {ADMIN_NAV_SECTIONS.map((section) => (
          <React.Fragment key={section.label}>
            <NavSectionLabel>{section.label}</NavSectionLabel>
            {section.items.map((item) => {
              const isActive = item.key === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.key);

              const navItem = (
                <NavItem
                  key={item.key}
                  active={isActive}
                  disabled={item.disabled}
                  onClick={() => handleNavClick(item.key, item.disabled)}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  {item.label}
                  {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
                </NavItem>
              );

              return item.disabled ? (
                <Tooltip key={item.key} title="Coming soon" placement="right">
                  {navItem}
                </Tooltip>
              ) : navItem;
            })}
          </React.Fragment>
        ))}

        <SidebarFooter>
          <FooterProfile>
            <FooterAvatar>{avatarLetter}</FooterAvatar>
            <FooterTextWrap>
              <FooterName>{user.name ?? "Admin"}</FooterName>
              <FooterRole>Super Admin</FooterRole>
            </FooterTextWrap>
          </FooterProfile>
          <FooterActions>
            <Tooltip title={isDark ? "Switch to light" : "Switch to dark"} placement="top">
              <FooterIconBtn onClick={() => setMode(isDark ? "light" : "dark")}>
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </FooterIconBtn>
            </Tooltip>
            <SignOutBtn onClick={logout}>
              <LogoutOutlined /> Sign Out
            </SignOutBtn>
          </FooterActions>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <MainArea>
        <TopBar>
          <Breadcrumb>
            Stockiva Platform &rsaquo; <BreadcrumbCurrent>{breadcrumb}</BreadcrumbCurrent>
          </Breadcrumb>
          <TopBarSpacer />
          <TopBarChip><LiveDot /> Live · 30s refresh</TopBarChip>
          <TopBarChip>🌏 {dateStr}</TopBarChip>
        </TopBar>

        <ContentArea>{children}</ContentArea>
      </MainArea>
    </AdminShell>
  );
};

export default PlatformAdminLayout;
