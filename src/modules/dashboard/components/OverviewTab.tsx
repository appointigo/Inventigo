import { Empty, Skeleton } from "antd";
import styled from "@emotion/styled";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CARD_RADIUS = 12;
const CARD_BORDER = "0.5px solid #e5e7eb";

const MetricsGrid = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`;

const MetricCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #f3f4f6;
  border-radius: ${CARD_RADIUS}px;
  padding: 1rem;
  min-height: 102px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
`;

const MetricValue = styled.div<{ color: string }>`
  margin-top: 6px;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  color: ${({ color }) => color};
`;

const MetricSubLabel = styled.div<{ color: string }>`
  margin-top: 4px;
  font-size: 11px;
  color: ${({ color }) => color};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  background: #ffffff;
  border: ${CARD_BORDER};
  border-radius: ${CARD_RADIUS}px;
  padding: 10px 12px;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #6b7280;
`;

const StatValue = styled.div<{ color: string }>`
  margin-top: 4px;
  font-size: 18px;
  font-weight: 500;
  color: ${({ color }) => color};
`;

const SectionCard = styled.section`
  background: #ffffff;
  border: ${CARD_BORDER};
  border-radius: ${CARD_RADIUS}px;
  padding: 12px;
  margin-bottom: 12px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const SectionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #111827;
`;

const Badge = styled.div<{ background: string; color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: ${({ background }) => background};
  color: ${({ color }) => color};
  font-size: 11px;
  padding: 3px 8px;
`;

const ViewToggleGroup = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const ToggleButton = styled.button<{ active?: boolean }>`
  border: none;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  background: ${({ active }) => (active ? "#378ADD" : "#f3f4f6")};
  color: ${({ active }) => (active ? "#ffffff" : "#4b5563")};
`;

type RevenueView = "day" | "month" | "year";

type OverviewMetric = {
  label: string;
  value: string;
  color: string;
  subLabel?: string;
};

type OverviewTabProps = {
  metrics: OverviewMetric[];
  todayRevenue: number;
  totalRevenue: number;
  totalSales: number;
  totalSalesThisMonth: number;
  revenueView: RevenueView;
  onRevenueViewChange: (value: RevenueView) => void;
  chartLoading: boolean;
  revenueData: Array<{ label: string; total: number }>;
  formatCurrency: (value: number) => string;
  formatCurrencyCompactK: (value: number) => string;
};

const OverviewTab = ({
  metrics,
  todayRevenue,
  totalRevenue,
  totalSales,
  totalSalesThisMonth,
  revenueView,
  onRevenueViewChange,
  chartLoading,
  revenueData,
  formatCurrency,
  formatCurrencyCompactK,
}: OverviewTabProps) => {
  return (
    <>
      <MetricsGrid>
        {metrics.map((metric) => (
          <MetricCard key={metric.label}>
            <div>
              <MetricLabel>{metric.label}</MetricLabel>
              <MetricValue color={metric.color}>{metric.value}</MetricValue>
            </div>
            {metric.subLabel ? <MetricSubLabel color={metric.color}>{metric.subLabel}</MetricSubLabel> : null}
          </MetricCard>
        ))}
      </MetricsGrid>

      <StatGrid>
        <StatCard>
          <StatLabel>Today's Revenue</StatLabel>
          <StatValue color="#185FA5">{formatCurrency(todayRevenue)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Total Sales this month</StatLabel>
          <StatValue color="#111827">{totalSalesThisMonth}</StatValue>
        </StatCard>
      </StatGrid>

      <SectionCard>
        <SectionHeader>
          <SectionGroup>
            <SectionTitle>Revenue trend</SectionTitle>
            <Badge background="#ecfdf5" color="#166534">
              <span>Total Revenue</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
            </Badge>
            <Badge background="#eff6ff" color="#1d4ed8">
              <span>Total Sales</span>
              <strong>{totalSales}</strong>
            </Badge>
            <Badge background="#f3f4f6" color="#374151">
              <span>Today's Revenue</span>
              <strong>{formatCurrency(todayRevenue)}</strong>
            </Badge>
          </SectionGroup>
          <ViewToggleGroup>
            {([
              { label: "Day", value: "day" },
              { label: "Month", value: "month" },
              { label: "Year", value: "year" },
            ] as const).map((option) => {
              const active = revenueView === option.value;
              return (
                <ToggleButton key={option.value} type="button" active={active} onClick={() => onRevenueViewChange(option.value)}>
                  {option.label}
                </ToggleButton>
              );
            })}
          </ViewToggleGroup>
        </SectionHeader>
        {chartLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : revenueData.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No revenue data" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
              <Area type="monotone" dataKey="total" stroke="#185FA5" strokeWidth={2.5} fill="#185FA5" fillOpacity={0.12} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </>
  );
};

export default OverviewTab;
