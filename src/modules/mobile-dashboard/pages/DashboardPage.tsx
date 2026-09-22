"use client";

import {
  ArrowDownOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, Skeleton } from "antd";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { PageContainer } from "../components/PageContainer";
import styles from "./DashboardPage.module.css";

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestTotal(points?: Array<{ total: number }>) {
  return finiteNumber(points?.at(-1)?.total);
}

export default function DashboardPage() {
  const { storeId, storeName } = useStore();
  const { data, loading, error } = useDashboard(storeId ?? undefined);

  const metricCards = [
    {
      title: "Today’s Sales",
      value: formatCurrency(latestTotal(data?.revenueTrend.day)),
      helper: "Sales recorded today",
      icon: ShoppingOutlined,
      tone: "blue",
    },
    {
      title: "Total Products",
      value: String(finiteNumber(data?.kpis.totalProducts)),
      helper: "Products in your catalogue",
      icon: TagsOutlined,
      tone: "teal",
    },
    {
      title: "Low Stock Alerts",
      value: String(finiteNumber(data?.kpis.lowStockCount)),
      helper: "Items needing attention",
      icon: WarningOutlined,
      tone: "amber",
    },
    {
      title: "Revenue Summary",
      value: formatCurrency(latestTotal(data?.revenueTrend.month)),
      helper: "Revenue this month",
      icon: BarChartOutlined,
      tone: "violet",
    },
  ] as const;

  return (
    <PageContainer
      title="Dashboard"
      subtitle={storeName ? `A clear view of ${storeName}` : "A clear view of your store"}
      style={{ paddingBottom: "calc(132px + env(safe-area-inset-bottom))" }}
    >
      {error ? (
        <Alert className={styles.alert} type="error" showIcon message="Dashboard data is unavailable" description={error} />
      ) : null}

      <section aria-label="Store summary" className={styles.metricGrid}>
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`${styles.metricCard} ${styles[card.tone]}`}>
              <div className={styles.cardTopline}>
                <span className={styles.iconWrap}><Icon /></span>
                {card.title === "Low Stock Alerts" && finiteNumber(data?.kpis.lowStockCount) > 0 ? (
                  <span className={styles.attention}><ArrowDownOutlined /> Review</span>
                ) : null}
              </div>
              <div className={styles.metricTitle}>{card.title}</div>
              {loading && !data ? <Skeleton.Input active size="small" className={styles.skeleton} /> : <div className={styles.metricValue}>{card.value}</div>}
              <div className={styles.metricHelper}>{card.helper}</div>
            </article>
          );
        })}
      </section>
    </PageContainer>
  );
}
