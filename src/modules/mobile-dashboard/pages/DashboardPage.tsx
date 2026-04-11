"use client";

import { ArrowRightOutlined, FireOutlined, ShoppingCartOutlined, TagsOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Empty, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useStore } from "@/providers/StoreProvider";
import { Card } from "../components/Card";
import { ListItem } from "../components/ListItem";
import { PageContainer } from "../components/PageContainer";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const router = useRouter();
  const { storeId, storeName } = useStore();
  const { data, loading } = useDashboard(storeId ?? undefined);
  const { items: lowStockItems, loading: alertsLoading } = useLowStockAlerts();
  const { sales, loading: salesLoading } = useSales();

  const today = dayjs().format("YYYY-MM-DD");
  const todaysSales = sales.filter((sale) => dayjs(sale.createdAt).format("YYYY-MM-DD") === today);
  const todaySalesTotal = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const revenueTotal = sales.reduce((sum, sale) => sum + sale.total, 0);

  const metricCards = [
    { title: "Today's Sales", value: formatCurrency(todaySalesTotal), icon: <ShoppingCartOutlined />, route: "/dashboard/billing", tone: "#1677ff" },
    { title: "Total Products", value: String(data?.kpis.totalProducts ?? 0), icon: <TagsOutlined />, route: "/dashboard/products", tone: "#0f766e" },
    { title: "Low Stock Alerts", value: String(data?.kpis.lowStockCount ?? 0), icon: <WarningOutlined />, route: "/dashboard/stock", tone: "#dc2626" },
    { title: "Revenue Summary", value: formatCurrency(revenueTotal), icon: <FireOutlined />, route: "/dashboard/billing", tone: "#7c3aed" },
  ];

  return (
    <PageContainer title="Retail Flow" subtitle={`Quick mobile view for ${storeName || "your active store"}`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {metricCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => router.push(card.route)}
            style={{ border: 0, padding: 0, background: "transparent", textAlign: "left" }}
          >
            <Card style={{ padding: 14, minHeight: 132, background: `linear-gradient(180deg, #ffffff 0%, ${card.tone}12 100%)` }}>
              <div style={{ display: "inline-flex", width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", background: `${card.tone}18`, color: card.tone, fontSize: 20 }}>
                {card.icon}
              </div>
              <div style={{ marginTop: 18, color: "#64748b", fontSize: 13 }}>{card.title}</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "#0f172a" }}>{card.value}</div>
            </Card>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <Typography.Text strong style={{ fontSize: 16 }}>Low Stock Drilldown</Typography.Text>
            <Button type="link" icon={<ArrowRightOutlined />} onClick={() => router.push("/dashboard/stock")}>View all</Button>
          </div>
          {loading || alertsLoading || salesLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : lowStockItems.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All products are healthy" />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {lowStockItems.slice(0, 4).map((item) => (
                <ListItem
                  key={item.id}
                  title={item.productName}
                  subtitle={`${item.brandName} • ${item.sizeLabel}`}
                  meta={<Typography.Text style={{ color: item.quantity <= 0 ? "#dc2626" : "#d97706", fontWeight: 700 }}>{item.quantity} left</Typography.Text>}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
