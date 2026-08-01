import { Empty, Skeleton } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CategorySizeHeatmap from "@/modules/dashboard/components/CategorySizeHeatmap";

const CARD_RADIUS = 12;
const CARD_BORDER = "0.5px solid #e5e7eb";
const BRAND_COLORS = ["#378ADD", "#15A085", "#E67E22", "#5B4DB7", "#D94E8F", "#6B8E23", "#C08A1D", "#E05252", "#0E7490", "#2F6EA8"];

type StockBrand = {
  brand: string;
  stockValue: number;
};

type StockCategory = {
  category: string;
  totalValue: number;
};

type StockMovement = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  quantity: number;
  reorderLevel: number;
};

type SizeHeatmapItem = {
  category: string;
  size: string;
  totalSold: number;
};

type StockTabProps = {
  topBrands: StockBrand[];
  topBrandsChartHeight: number;
  chartLoading: boolean;
  stockByCategory: StockCategory[];
  categorySizeHeatmapData: SizeHeatmapItem[];
  lowStockItems: StockMovement[];
  lowStockLoading: boolean;
  formatCurrency: (value: number) => string;
  formatCurrencyCompactK: (value: number) => string;
};

function getStockStatus(quantity: number, min: number) {
  const safeMin = min > 0 ? min : 1;
  const ratio = quantity / safeMin;
  if (ratio < 0.3) {
    return { label: "Critical", fill: "#ef4444", badgeBg: "#fee2e2", badgeColor: "#b91c1c" };
  }
  if (ratio < 0.6) {
    return { label: "Low", fill: "#f59e0b", badgeBg: "#fef3c7", badgeColor: "#b45309" };
  }
  return { label: "Healthy", fill: "#22c55e", badgeBg: "#dcfce7", badgeColor: "#166534" };
}

const StockTab = ({
  topBrands,
  topBrandsChartHeight,
  chartLoading,
  stockByCategory,
  categorySizeHeatmapData,
  lowStockItems,
  lowStockLoading,
  formatCurrency,
  formatCurrencyCompactK,
}: StockTabProps) => {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Stock value by brand</div>
        </div>
        {chartLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} title={false} />
        ) : topBrands.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No brand stock data" />
        ) : (
          <ResponsiveContainer width="100%" height={topBrandsChartHeight}>
            <BarChart layout="vertical" data={topBrands} margin={{ top: 8, right: 12, left: 24, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} vertical />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
              <YAxis type="category" dataKey="brand" width={180} interval={0} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} labelStyle={{ fontSize: 11, color: "#6b7280" }} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
              <Bar dataKey="stockValue" radius={[0, 4, 4, 0]} barSize={14}>
                {topBrands.map((_, index) => (
                  <Cell key={index} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Stock by category</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Units per category</div>
        </div>
        {chartLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} title={false} />
        ) : (stockByCategory?.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No category stock data" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stockByCategory ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
              <Bar dataKey="totalValue" fill="#378ADD" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <CategorySizeHeatmap
        data={categorySizeHeatmapData}
        allCategories={stockByCategory.map((row) => row.category)}
      />

      <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <WarningOutlined style={{ color: "#d97706", fontSize: 12 }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Low stock alerts</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{lowStockItems.length} items below threshold</div>
        </div>
        {lowStockLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : lowStockItems.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>No low stock alerts.</div>
        ) : (
          <table className="dashboard-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {[
                  { label: "Product", align: "left" as const },
                  { label: "Stock", align: "left" as const },
                  { label: "Min", align: "center" as const },
                  { label: "Status", align: "center" as const },
                ].map((header) => (
                  <th key={header.label} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: header.align, padding: "8px 6px", borderBottom: "0.5px solid #e5e7eb" }}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item, index) => {
                const status = getStockStatus(item.quantity, item.reorderLevel);
                const ratio = Math.max(0, Math.min(1, item.quantity / (item.reorderLevel > 0 ? item.reorderLevel : 1)));
                return (
                  <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                    <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                      <div style={{ fontSize: 12, color: "#111827" }}>{item.productName}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>{item.sku} · {item.sizeLabel}</div>
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                      <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", background: status.fill }} />
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "#374151" }}>{item.quantity}</div>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 12, color: "#374151" }}>{item.reorderLevel}</td>
                    <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 500, background: status.badgeBg, color: status.badgeColor }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default StockTab;
