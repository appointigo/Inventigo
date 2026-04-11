"use client";

import { AppstoreOutlined, BarChartOutlined, DollarOutlined, InboxOutlined, ShoppingOutlined, TagsOutlined } from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: BarChartOutlined },
  { key: "categories", label: "Categories", href: "/dashboard/categories", icon: AppstoreOutlined },
  { key: "brands", label: "Brands", href: "/dashboard/brands", icon: TagsOutlined },
  { key: "products", label: "Products", href: "/dashboard/products", icon: ShoppingOutlined },
  { key: "stock", label: "Stock", href: "/dashboard/stock", icon: InboxOutlined },
  { key: "billing", label: "Billing", href: "/dashboard/billing", icon: DollarOutlined },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 40,
        maxWidth: 640,
        marginInline: "auto",
        borderRadius: 26,
        background: "rgba(15, 23, 42, 0.94)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 48px rgba(15, 23, 42, 0.3)",
        backdropFilter: "blur(18px)",
        padding: "8px 10px calc(8px + env(safe-area-inset-bottom))",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => router.push(item.href)}
              style={{
                border: 0,
                background: active ? "rgba(255,255,255,0.14)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.64)",
                minHeight: 56,
                borderRadius: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                minWidth: 0,
              }}
            >
              <Icon style={{ fontSize: 18 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
