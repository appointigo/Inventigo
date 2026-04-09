"use client";

import React from "react";
import {
  DashboardOutlined,
  ApartmentOutlined,
  TagsOutlined,
  UsergroupAddOutlined,
  FlagOutlined,
  NotificationOutlined,
  BarChartOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import type { NavSection, PricingPlan } from "./types";

// ── Sidebar nav definition ─────────────────────────────────────────────────

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
      { key: "/admin/organizations", icon: <ApartmentOutlined />, label: "Organizations" },
    ],
  },
  {
    label: "Manage",
    items: [
      { key: "/admin/pricing-plans", icon: <TagsOutlined />, label: "Pricing Plans" },
      { key: "/admin/platform-users", icon: <UsergroupAddOutlined />, label: "Platform Users" },
      { key: "/admin/feature-flags", icon: <FlagOutlined />, label: "Feature Flags" },
      { key: "/admin/announcements", icon: <NotificationOutlined />, label: "Announcements" },
    ],
  },
  {
    label: "Insights",
    items: [
      { key: "/admin/analytics", icon: <BarChartOutlined />, label: "Analytics" },
      { key: "/admin/audit-log", icon: <FileSearchOutlined />, label: "Audit Log" },
    ],
  },
];

// ── Breadcrumb labels per route ────────────────────────────────────────────

export const ADMIN_BREADCRUMBS: Record<string, string> = {
  "/admin":               "Dashboard",
  "/admin/organizations": "Organizations",
  "/admin/pricing-plans": "Pricing Plans",
  "/admin/platform-users": "Platform Users",
  "/admin/analytics":      "Analytics",
  "/admin/audit-log":      "Audit Log",
  "/admin/feature-flags":  "Feature Flags",
  "/admin/announcements":  "Announcements",
};

// ── Plan colours (Ant Design tag colours) ─────────────────────────────────

export const PLAN_TAG_COLORS: Record<string, string> = {
  FREE:       "default",
  PRO:        "blue",
  ENTERPRISE: "gold",
};

// ── Static plan definitions (UI seed; backend will own these when Prisma model is added) ──

export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    maxUsers: 5,
    maxStores: 1,
    maxProducts: 100,
    tagline: "Get started at no cost. Perfect for single-store retailers.",
    features: [
      { key: "inventory",       label: "Inventory management", enabled: true  },
      { key: "billing",         label: "Sales & billing",      enabled: true  },
      { key: "reports_basic",   label: "Basic reports",        enabled: true  },
      { key: "purchase_orders", label: "Purchase orders",      enabled: false },
      { key: "promo_codes",     label: "Promo codes",          enabled: false },
      { key: "api_access",      label: "API access",           enabled: false },
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    maxUsers: 25,
    maxStores: 5,
    maxProducts: 1000,
    tagline: "For growing businesses managing multiple stores.",
    features: [
      { key: "everything_free", label: "Everything in Free",  enabled: true  },
      { key: "purchase_orders", label: "Purchase orders",     enabled: true  },
      { key: "promo_codes",     label: "Promo codes",         enabled: true  },
      { key: "reports_adv",    label: "Advanced reports",     enabled: true  },
      { key: "api_access",      label: "API access",          enabled: false },
      { key: "white_label",     label: "White-label",         enabled: false },
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 99,
    maxUsers: -1,
    maxStores: -1,
    maxProducts: -1,
    tagline: "Unlimited scale for enterprise retail chains.",
    features: [
      { key: "everything_pro",  label: "Everything in Pro",    enabled: true },
      { key: "api_access",      label: "API access",           enabled: true },
      { key: "white_label",     label: "White-label branding", enabled: true },
      { key: "integrations",    label: "Custom integrations",  enabled: true },
      { key: "support",         label: "Dedicated support",    enabled: true },
      { key: "sla",             label: "SLA guarantee",        enabled: true },
    ],
  },
];

// ── Sidebar design tokens (always dark, independent of app theme) ──────────

export const SIDEBAR_TOKENS = {
  bg:          "#0f172a",
  border:      "#1e293b",
  hover:       "#1e293b",
  activeText:  "#60a5fa",
  activeBg:    "#1677ff18",
  activeBorder:"#1677ff",
  textMuted:   "#94a3b8",
  textLabel:   "#475569",
  footerBg:    "#0f172a",
} as const;
