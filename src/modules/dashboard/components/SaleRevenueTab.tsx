import { DatePicker, Empty, Flex, Segmented, Skeleton, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import type { SaleSummary } from "@/modules/billing/types";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PaymentMethodDistributionChart from "@/modules/dashboard/components/PaymentMethodDistributionChart";

type SalesInternalTab = "overview" | "profitability" | "transactions";
type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";

type SalesBreakdownDataRow = {
  label: string;
  totalRevenue: number;
  discountGiven: number;
  grossProfit: number;
  transactionCount: number;
  period: string;
};

type ProfitabilityMetric = {
  label: string;
  value: string;
  color: string;
  subLabel?: string;
};

type RevenueComparison = {
  label: string;
  percentage: number;
  isPositive: boolean;
};

type ExpenseBreakdownEntry = {
  category: string;
  amount: number;
  percentage: number;
};

type SelectedBucketExpenseAnalytics = {
  breakdown?: ExpenseBreakdownEntry[];
};

type ProfitabilitySummary = {
  businessHealth: string;
  grossMarginPct: number;
  netProfitMarginPct: number;
  expenseRatioPct: number;
  profitToExpenseRatio: number;
  breakEvenGap: number;
  breakEvenRevenue: number;
  revenue: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
};

type SaleRevenueTabProps = {
  period: SalesPeriod;
  onPeriodChange: (value: SalesPeriod) => void;
  customDateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
  onCustomDateRangeChange: (value: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => void;
  salesInternalTab: SalesInternalTab;
  onSalesInternalTabChange: (value: SalesInternalTab) => void;
  salesPeriodMetrics: ProfitabilityMetric[];
  revenueComparison: RevenueComparison;
  salesBreakdownLoading: boolean;
  salesBreakdownData: SalesBreakdownDataRow[];
  paymentSales: SaleSummary[];
  activeBucketLabel: string;
  dayOfWeekPatternData: Array<{ day: string; total: number }>;
  profitabilityKpis: Array<{ label: string; value: string; color: string }>;
  expenseAnalyticsLoading: boolean;
  netProfitTrendData: Array<{ label: string; period: string; netProfit: number }>;
  grossProfitVsExpenseData: Array<{ label: string; period: string; grossProfit: number; operatingExpenses: number }>;
  selectedBucketExpenseAnalyticsLoading: boolean;
  selectedBucketExpenseAnalytics: SelectedBucketExpenseAnalytics | null;
  profitabilitySummary: ProfitabilitySummary;
  largestExpense: ExpenseBreakdownEntry | null;
  chartLoading: boolean;
  recentMovements: Array<{
    id: string;
    productName: string;
    sku: string;
    sizeLabel: string;
    type: string;
    quantity: number;
    createdAt: string;
  }>;
  formatCurrency: (value: number) => string;
  formatCurrencyCompactK: (value: number) => string;
  formatDateTime: (value: string) => string;
};

const SaleRevenueTab = ({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateRangeChange,
  salesInternalTab,
  onSalesInternalTabChange,
  salesPeriodMetrics,
  revenueComparison,
  salesBreakdownLoading,
  salesBreakdownData,
  paymentSales,
  activeBucketLabel,
  dayOfWeekPatternData,
  profitabilityKpis,
  expenseAnalyticsLoading,
  netProfitTrendData,
  grossProfitVsExpenseData,
  selectedBucketExpenseAnalyticsLoading,
  selectedBucketExpenseAnalytics,
  profitabilitySummary,
  largestExpense,
  chartLoading,
  recentMovements,
  formatCurrency,
  formatCurrencyCompactK,
  formatDateTime,
}: SaleRevenueTabProps) => {
  return (
    <div className="grid gap-4" style={{ display: "grid", gap: 16 }}>
      <Flex align="center" justify="space-between" gap={16}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
          {dayjs().format("DD MMM YYYY")}
        </div>
        <div style={{ display: "inline-flex", borderRadius: 8, background: "#f3f4f6", padding: "4px" }}>
          <Segmented
            options={[
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
              { label: "Yearly", value: "yearly" },
            ]}
            value={period}
            onChange={(value) => onPeriodChange(value as SalesPeriod)}
            disabled={!!(customDateRange && customDateRange[0] && customDateRange[1])}
            size="medium"
            style={{ background: "transparent", borderRadius: 6 }}
          />
        </div>
      </Flex>

      <Flex align="center" gap={12} style={{ padding: "12px 0" }}>
        <DatePicker.RangePicker
          value={customDateRange}
          onChange={(dates) => {
            onCustomDateRangeChange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
            if (dates && dates[0] && dates[1]) {
              onPeriodChange("daily");
            }
          }}
          format="DD MMM YYYY"
          style={{ width: "auto", minWidth: 280 }}
        />
      </Flex>

      <Tabs
        activeKey={salesInternalTab}
        onChange={(key) => onSalesInternalTabChange(key as SalesInternalTab)}
        size="small"
        tabBarStyle={{ background: "#f3f4f6", padding: "4px 6px", borderRadius: 10, marginBottom: 16 }}
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                  {salesPeriodMetrics.map((metric) => {
                    const isTotalRevenue = metric.label === "Total revenue";
                    const isNetProfit = metric.label === "Net profit";
                    const isDiscountGiven = metric.label === "Discount given";

                    let textColor = metric.color;
                    if (isNetProfit) textColor = "#1D9E75";
                    if (isDiscountGiven) textColor = "#D85A30";

                    return (
                      <div
                        key={metric.label}
                        style={{
                          background: "#ffffff",
                          border: "0.5px solid rgba(0, 0, 0, 0.10)",
                          borderRadius: 12,
                          padding: 20,
                        }}
                      >
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, lineHeight: 1.4 }}>
                          {metric.label}
                        </div>
                        <div
                          style={{
                            fontSize: isTotalRevenue ? 32 : 26,
                            fontWeight: 500,
                            lineHeight: 1.2,
                            color: textColor,
                            marginBottom: isTotalRevenue ? 8 : 0,
                          }}
                        >
                          {metric.value}
                        </div>
                        {isTotalRevenue && (
                          <Tag
                            color={revenueComparison.isPositive ? "success" : "error"}
                            style={{
                              borderRadius: 999,
                              fontWeight: 500,
                              padding: "4px 10px",
                              marginTop: 4,
                            }}
                          >
                            {`${revenueComparison.isPositive ? "+" : "-"}${revenueComparison.percentage}% ${revenueComparison.label}`}
                          </Tag>
                        )}
                        {metric.subLabel && isNetProfit && (
                          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                            {metric.subLabel}
                          </div>
                        )}
                        {metric.subLabel && isDiscountGiven && (
                          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                            {metric.subLabel}
                          </div>
                        )}
                        {metric.subLabel && !isNetProfit && !isDiscountGiven && (
                          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                            {metric.subLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Sales breakdown</div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, background: "#378ADD", borderRadius: 2 }} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Revenue</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, background: "#d4a332", borderRadius: 2 }} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Discount</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, background: "#4caf8a", borderRadius: 2 }} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Profit</span>
                      </div>
                    </div>
                  </div>

                  {salesBreakdownLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} title={false} />
                  ) : salesBreakdownData.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales breakdown data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={salesBreakdownData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload || payload.length === 0) return null;
                            const row = payload[0]?.payload as { totalRevenue: number; discountGiven: number; grossProfit: number };
                            return (
                              <div style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{String(label ?? "")}</div>
                                <div style={{ fontSize: 12, color: "#378ADD" }}>Total Revenue : {formatCurrency(Number(row.totalRevenue ?? 0))}</div>
                                <div style={{ fontSize: 12, color: "#d4a332" }}>Discount given : {formatCurrency(Number(row.discountGiven ?? 0))}</div>
                                <div style={{ fontSize: 12, color: "#4caf8a" }}>Gross Profit : {formatCurrency(Number(row.grossProfit ?? 0))}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="totalRevenue" fill="#378ADD" radius={[4, 4, 0, 0]} barSize={14} />
                        <Bar dataKey="discountGiven" fill="#d4a332" radius={[4, 4, 0, 0]} barSize={14} />
                        <Bar dataKey="grossProfit" fill="#4caf8a" radius={[4, 4, 0, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                <div style={{ display: "grid", gridTemplateColumns: "1.22fr 0.78fr", gap: 12 }}>
                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Payment method distribution</div>
                    <PaymentMethodDistributionChart
                      sales={paymentSales}
                      loading={false}
                      height={340}
                      activeBucketLabel={activeBucketLabel}
                    />
                  </section>

                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Day-of-week pattern</div>
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={dayOfWeekPatternData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                        <Bar dataKey="total" fill="#185FA5" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </section>
                </div>
              </div>
            ),
          },
          {
            key: "profitability",
            label: "Profitability",
            children: (
              <div style={{ display: "grid", gap: 16 }}>
                <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Profitability summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                    {profitabilityKpis.map((metric) => (
                      <div
                        key={metric.label}
                        style={{
                          background: "#f9fafb",
                          border: "0.5px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{metric.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: metric.color }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Revenue vs gross profit</div>
                  {salesBreakdownLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} title={false} />
                  ) : salesBreakdownData.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No profitability comparison data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={salesBreakdownData.map((row) => ({
                        label: row.label,
                        period: row.period,
                        revenue: Number(row.totalRevenue ?? 0),
                        grossProfit: Number(row.grossProfit ?? 0),
                      }))} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                        <Bar dataKey="revenue" fill="#378ADD" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="grossProfit" fill="#2f855a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Net profit trend</div>
                    {expenseAnalyticsLoading ? (
                      <Skeleton active paragraph={{ rows: 4 }} title={false} />
                    ) : netProfitTrendData.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No net profit data" />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={netProfitTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="netProfit" stroke="#2f855a" fill="#dcfce7" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </section>

                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Gross profit vs operating expenses</div>
                    {expenseAnalyticsLoading ? (
                      <Skeleton active paragraph={{ rows: 4 }} title={false} />
                    ) : grossProfitVsExpenseData.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No operating expense comparison data" />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={grossProfitVsExpenseData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                          <Bar dataKey="grossProfit" fill="#2f855a" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="operatingExpenses" fill="#b45309" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </section>

                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Expense breakdown</div>
                    {selectedBucketExpenseAnalyticsLoading ? (
                      <Skeleton active paragraph={{ rows: 4 }} title={false} />
                    ) : (selectedBucketExpenseAnalytics?.breakdown?.length ?? 0) === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expense breakdown" />
                    ) : (
                      <div style={{ display: "grid", gap: 12 }}>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={selectedBucketExpenseAnalytics?.breakdown ?? []} dataKey="amount" nameKey="category" innerRadius={54} outerRadius={86} paddingAngle={2}>
                              {(selectedBucketExpenseAnalytics?.breakdown ?? []).map((entry, index) => (
                                <Cell key={`${entry.category}-${index}`} fill={["#378ADD", "#b45309", "#2f855a", "#8b5cf6", "#ef4444", "#f59e0b"][index % 6]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(selectedBucketExpenseAnalytics?.breakdown ?? []).slice(0, 4).map((entry) => (
                            <div key={entry.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#374151" }}>
                              <span>{entry.category}</span>
                              <span style={{ fontWeight: 600 }}>{entry.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Business health</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb" }}>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Overall status</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: profitabilitySummary.businessHealth === "Healthy" ? "#2f855a" : profitabilitySummary.businessHealth === "Good" ? "#2563eb" : profitabilitySummary.businessHealth === "Average" ? "#d97706" : "#dc2626" }}>
                        {profitabilitySummary.businessHealth}
                      </div>
                      <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#6b7280" }}>
                        <div>Gross margin: {profitabilitySummary.grossMarginPct}%</div>
                        <div>Net profit margin: {profitabilitySummary.netProfitMarginPct}%</div>
                        <div>Expense ratio: {profitabilitySummary.expenseRatioPct}%</div>
                        <div>Profit-to-expense ratio: {profitabilitySummary.profitToExpenseRatio.toFixed(2)}x</div>
                        <div>Revenue growth: {revenueComparison.isPositive ? "+" : "-"}{revenueComparison.percentage}%</div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb" }}>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Key note</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {largestExpense ? `${largestExpense.category} is the largest expense bucket at ${formatCurrency(largestExpense.amount)}.` : "Expense data is still being collected for this period."}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                        {profitabilitySummary.breakEvenGap >= 0
                          ? `Your business is operating above break-even.`
                          : `You are ${formatCurrency(Math.abs(profitabilitySummary.breakEvenGap))} below break-even this period.`}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        Break-even revenue: {formatCurrency(profitabilitySummary.breakEvenRevenue)}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ),
          },
          {
            key: "transactions",
            label: "Transactions",
            children: (
              <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ marginBottom: 16, fontSize: 15, fontWeight: 500, color: "#111827" }}>Recent stock movements</div>
                {chartLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} title={false} />
                ) : (recentMovements?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>No recent stock movements.</div>
                ) : (
                  <table className="dashboard-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        {[
                          { label: "Product", align: "left" as const },
                          { label: "Type", align: "center" as const },
                          { label: "Qty", align: "right" as const },
                          { label: "Time", align: "left" as const },
                        ].map((header) => (
                          <th key={header.label} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: header.align, padding: "8px 6px", borderBottom: "0.5px solid #e5e7eb" }}>
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(recentMovements ?? []).map((movement, index) => {
                        const isOut = movement.type === "OUT" || movement.type === "SALE" || movement.quantity < 0;
                        const typeLabel = movement.type === "IN" ? "PURCHASE IN" : movement.type;
                        const typeBadge = isOut
                          ? { bg: "#ffe4e6", color: "#be123c" }
                          : { bg: "#dcfce7", color: "#166534" };
                        const qtyValue = isOut
                          ? `−${Math.abs(movement.quantity)}`
                          : `+${Math.abs(movement.quantity)}`;
                        return (
                          <tr key={movement.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                            <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                              <div style={{ fontSize: 12, color: "#111827" }}>{movement.productName}</div>
                              <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>{movement.sku} · {movement.sizeLabel}</div>
                            </td>
                            <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                              <span style={{ display: "inline-flex", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 500, background: typeBadge.bg, color: typeBadge.color }}>
                                {typeLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 12, fontWeight: 600, color: isOut ? "#dc2626" : "#16a34a" }}>{qtyValue}</td>
                            <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 11, color: "#6b7280" }}>{formatDateTime(movement.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            ),
          },
        ]}
      />
    </div>
  );
};

export default SaleRevenueTab;
