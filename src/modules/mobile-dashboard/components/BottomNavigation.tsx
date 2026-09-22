"use client";

import {
  BarChartOutlined,
  DollarOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import styles from "./BottomNavigation.module.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: BarChartOutlined },
  { key: "demand", label: "Demand", href: "/dashboard/demand", icon: UserAddOutlined },
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
    <nav aria-label="Primary" className={styles.navigation}>
      <div className={styles.items}>
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
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
