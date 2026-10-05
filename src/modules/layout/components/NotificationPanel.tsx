"use client";

import { useRouter } from "next/navigation";
import { Badge, Button, Dropdown, Empty, Skeleton, Typography } from "antd";
import { BellOutlined, WarningOutlined } from "@ant-design/icons";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useStore } from "@/providers/StoreProvider";

const { Text } = Typography;

export default function NotificationPanel() {
  const router = useRouter();
  const { storeId } = useStore();
  const { items, loading } = useLowStockAlerts(storeId ?? undefined);
  const alerts = Array.isArray(items) ? items : [];
  const visibleItems = alerts.slice(0, 6);

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        popupRender={() => (
          <div className="notification-panel">
            <div className="notification-heading">
              <div><Text strong>Needs attention</Text><div><Text type="secondary" style={{ fontSize: 12 }}>Operational alerts for your store</Text></div></div>
              {alerts.length > 0 ? <Badge count={alerts.length} overflowCount={99} /> : null}
            </div>
            {loading ? <Skeleton active paragraph={{ rows: 3 }} title={false} /> : visibleItems.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You’re all caught up" />
            ) : (
              <div>
                {visibleItems.map((item) => (
                  <button key={item.id} type="button" className="notification-item" onClick={() => router.push("/dashboard/stock")}>
                    <span className="notification-icon"><WarningOutlined /></span>
                    <div><Text strong>{item.productName || "Unnamed product"}</Text><div><Text type="secondary" style={{ fontSize: 12 }}>{item.sizeLabel || "No size"} · {Number(item.quantity ?? 0)} left · reorder at {Number(item.reorderLevel ?? 0)}</Text></div></div>
                  </button>
                ))}
              </div>
            )}
            <Button type="text" block onClick={() => router.push("/dashboard/alerts")}>View alert settings</Button>
          </div>
        )}
      >
        <Badge count={alerts.length} size="small" overflowCount={99}>
          <Button type="text" shape="circle" icon={<BellOutlined />} aria-label={`${alerts.length} notifications`} />
        </Badge>
      </Dropdown>
      <style jsx global>{`
        .notification-panel { width: min(380px, calc(100vw - 24px)); padding: 14px; border: 1px solid #e5eaf0; border-radius: 12px; background: #fff; box-shadow: 0 14px 40px rgba(15, 23, 42, .14); }
        .notification-heading { display: flex; justify-content: space-between; align-items: center; padding: 2px 4px 12px; }
        .notification-item { width: 100%; border: 0; background: transparent; display: flex; align-items: center; text-align: left; gap: 10px; padding: 10px 6px; cursor: pointer; }
        .notification-item:hover { background: #f8fafc; }
        .notification-icon { width: 32px; height: 32px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; color: #d97706; background: #fffbeb; }
      `}</style>
    </>
  );
}
