"use client";

import {
  DashboardOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import styles from "./BottomNavigation.module.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: DashboardOutlined },
  { key: "sales", label: "Sales", href: "/dashboard/billing", icon: ShoppingCartOutlined },
  { key: "inventory", label: "Inventory", href: "/dashboard/products", icon: InboxOutlined },
  { key: "settings", label: "Settings", href: "/dashboard/settings", icon: SettingOutlined },
] as const;

function isActivePath(pathname: string, key: (typeof NAV_ITEMS)[number]["key"]) {
  if (key === "dashboard") return pathname === "/dashboard";
  if (key === "sales") {
    return ["/dashboard/billing", "/dashboard/customers", "/dashboard/sales", "/dashboard/whatsapp"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }
  if (key === "inventory") {
    return [
      "/dashboard/products",
      "/dashboard/stock",
      "/dashboard/categories",
      "/dashboard/brands",
      "/dashboard/demand",
      "/dashboard/inventory-intelligence",
    ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  return pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");
}

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav aria-label="Primary" className={styles.navigation}>
      <div className={styles.items}>
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.key);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => router.push(item.href)}
              className={`${styles.item} ${active ? styles.active : ""}`}
            >
              <Icon style={{ fontSize: 18 }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
