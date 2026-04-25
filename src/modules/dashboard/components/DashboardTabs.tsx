"use client";

export type DashboardTab = "overview" | "stock" | "sales";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const TAB_ITEMS: Array<{ key: DashboardTab; label: string; mobileLabel: string }> = [
  { key: "overview", label: "Overview", mobileLabel: "Overview" },
  { key: "stock", label: "Stock", mobileLabel: "Stock" },
  { key: "sales", label: "Sales & Revenue", mobileLabel: "Sales" },
];

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div
      style={{
        borderBottom: "0.5px solid #e5e7eb",
        background: "#f3f4f6",
        marginBottom: 16,
        borderRadius: 10,
        padding: "6px 8px",
      }}
    >
      <div className="dashboard-tabs-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap" }}>
        {TAB_ITEMS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                background: active ? "#111827" : "transparent",
                color: active ? "#ffffff" : "#6b7280",
                flex: "0 0 auto",
              }}
            >
              <span className="desktop-label">{tab.label}</span>
              <span className="mobile-label">{tab.mobileLabel}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .dashboard-tabs-scroll::-webkit-scrollbar {
          height: 0;
        }

        .mobile-label {
          display: none;
        }

        @media (max-width: 767px) {
          .desktop-label {
            display: none;
          }

          .mobile-label {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}
