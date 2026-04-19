import { useMemo } from "react";
import { Card, Row, Col, Table, Typography, Flex, Button } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { StoreExpense, ExpenseSummary } from "../../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { ProfitHero, ProfitContent, ProfitLabel, ProfitValue, ProfitSubtitle, ProfitMarginBadge, HeroCard, HeroIcon, HeroTitle, HeroValue, HeroSubtitle } from "../ExpenseAdvancedTab.styled";
import dayjs from "dayjs";

interface PLViewTabProps {
  expenses: StoreExpense[];
  summary: ExpenseSummary | null;
  monthLabel: string;
  selectedYear: number;
}

// Mock P&L data
const PL_BREAKDOWN = [
  { label: "Gross Revenue", amount: 324000, percentage: 100.0 },
  { label: "Rent", amount: 40000, percentage: 12.3 },
  { label: "Electricity", amount: 6116, percentage: 1.6 },
  { label: "Employee Salary", amount: 12000, percentage: 1.5 },
  { label: "Cleaning", amount: 1000, percentage: 0.3 },
];

const MONTHLY_DATA = [
  { month: "Jan", revenue: 85000, expenses: 28000 },
  { month: "Feb", revenue: 72000, expenses: 15000 },
  { month: "Mar", revenue: 95000, expenses: 35000 },
  { month: "Apr", revenue: 324000, expenses: 0 },
];

const PLViewTab = ({ expenses, summary, monthLabel, selectedYear }: PLViewTabProps) => {
  const { totalRevenue, totalExpenses, netProfit, profitMargin } = useMemo(() => {
    const revenue = summary?.grandTotal ?? 324000;
    const expenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
    const net = revenue - expenseAmount;
    const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : 0;

    return {
      totalRevenue: revenue,
      totalExpenses: expenseAmount,
      netProfit: net,
      profitMargin: margin,
    };
  }, [expenses, summary]);

  const plTableData = useMemo(() => {
    const expenseRows = PL_BREAKDOWN.map((item, idx) => ({
      key: idx === 0 ? "__revenue" : item.label.toLowerCase().replace(/\s+/g, "-"),
      label: item.label,
      amount: item.amount,
      percentage: item.percentage,
      type: idx === 0 ? "revenue" : "expense",
    }));

    // Add Total Expenses row
    expenseRows.push({
      key: "__total",
      label: "Total Expenses",
      amount: totalExpenses,
      percentage: 0.0,
      type: "total",
    });

    // Add Net Profit row
    expenseRows.push({
      key: "__profit",
      label: "Net Profit",
      amount: netProfit,
      percentage: parseFloat(profitMargin as string),
      type: "profit",
    });

    return expenseRows;
  }, [expenses, summary, totalExpenses, netProfit, profitMargin]);

  return (
    <>
      {/* Hero Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <HeroCard gradient="linear-gradient(135deg, #10b981, #059669)">
            <HeroIcon>💰</HeroIcon>
            <HeroTitle>Total Revenue (Sales)</HeroTitle>
            <HeroValue fontSize={36}>{formatCurrency(totalRevenue)}</HeroValue>
            <HeroSubtitle>{monthLabel} · Other sales</HeroSubtitle>
          </HeroCard>
        </Col>
        <Col xs={24} sm={12}>
          <HeroCard gradient="linear-gradient(135deg, #ef4444, #dc2626)">
            <HeroIcon>💸</HeroIcon>
            <HeroTitle>Total Expenses</HeroTitle>
            <HeroValue fontSize={36}>{formatCurrency(totalExpenses)}</HeroValue>
            <HeroSubtitle>{monthLabel} · Store + Staff + Petty Cash</HeroSubtitle>
          </HeroCard>
        </Col>
      </Row>

      {/* Profit Hero */}
      <ProfitHero style={{ marginBottom: 20 }}>
        <ProfitContent>
          <ProfitLabel>NET PROFIT — {monthLabel.toUpperCase()}</ProfitLabel>
          <ProfitValue>{formatCurrency(netProfit)}</ProfitValue>
          <ProfitSubtitle>Revenue minus all operating expenses</ProfitSubtitle>
          <ProfitMarginBadge>✅ {profitMargin}% Profit Margin</ProfitMarginBadge>
        </ProfitContent>
      </ProfitHero>

      {/* Chart and Table Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Chart */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title="📊 Revenue vs Expenses (Monthly)"
            style={{ height: "100%" }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* P&L Breakdown Table */}
        <Col xs={24} lg={12}>
          <Card size="small" title="📋 P&L Breakdown" extra={<Button type="default" size="small">Export</Button>}>
            <Table
              dataSource={plTableData}
              rowKey="key"
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Line Item",
                  dataIndex: "label",
                  width: "50%",
                  render: (text: string, record: any) => {
                    let color = "#000";
                    let fontWeight = 400;
                    let paddingLeft = 0;
                    let displayText = text;

                    if (record.type === "revenue") {
                      color = "#16a34a"; // green
                      fontWeight = 700;
                    } else if (record.type === "expense") {
                      color = "#647c8f"; // slate grey
                      paddingLeft = 16;
                      displayText = `↳ ${text}`;
                    } else if (record.type === "total") {
                      color = "#1f2937"; // dark grey
                      fontWeight = 700;
                    } else if (record.type === "profit") {
                      color = "#2563eb"; // blue
                      fontWeight = 700;
                    }

                    return (
                      <span style={{ paddingLeft, color, fontWeight }}>
                        <strong>{displayText}</strong>
                      </span>
                    );
                  },
                },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  render: (v: number, record: any) => {
                    let color = "#000";
                    let fontWeight = 400;

                    if (record.type === "revenue") {
                      color = "#16a34a"; // green
                      fontWeight = 700;
                    } else if (record.type === "total") {
                      color = "#ef4444"; // red
                      fontWeight = 700;
                    } else if (record.type === "profit") {
                      color = "#2563eb"; // blue
                      fontWeight = 700;
                    }

                    return (
                      <Typography.Text
                        strong={fontWeight === 700}
                        style={{
                          color,
                          fontWeight,
                        }}
                      >
                        {formatCurrency(v)}
                      </Typography.Text>
                    );
                  },
                  align: "right" as const,
                  width: "30%",
                },
                {
                  title: "% of Revenue",
                  dataIndex: "percentage",
                  render: (v: number, record: any) => {
                    let color = "#000";
                    let fontWeight = 400;

                    if (record.type === "revenue") {
                      color = "#16a34a"; // green
                      fontWeight = 700;
                    } else if (record.type === "total") {
                      color = "#ef4444"; // red
                      fontWeight = 700;
                    } else if (record.type === "profit") {
                      color = "#2563eb"; // blue
                      fontWeight = 700;
                    }

                    return (
                      <Typography.Text
                        strong={fontWeight === 700}
                        style={{
                          color,
                          fontWeight,
                          fontSize: 13,
                        }}
                      >
                        {v.toFixed(1)}%
                      </Typography.Text>
                    );
                  },
                  align: "right" as const,
                  width: "20%",
                },
              ]}
              onRow={(record: any) => {
                const isSelected =
                  record.type === "revenue" || record.type === "total" || record.type === "profit";
                return {
                  className: isSelected ? "ant-table-row-selected" : "",
                  style: {
                    backgroundColor: isSelected ? "#dbeafe" : "transparent",
                  },
                };
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tip Card */}
      <Card
        size="small"
        style={{
          background: "#f0fdf4",
          border: "1px solid #a7f3d0",
        }}
      >
        <Typography.Text style={{ fontSize: 13, color: "#065f46" }}>
          💡 <strong>Tip:</strong> Connect your sales revenue data to see full P&L &
          Revenue tracking coming soon.
        </Typography.Text>
      </Card>
    </>
  );
};

export default PLViewTab;