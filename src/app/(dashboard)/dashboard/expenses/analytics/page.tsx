"use client";

import { useState, useMemo } from "react";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  InputNumber,
  Modal,
  Progress,
  Row,
  Statistic,
  Typography,
} from "antd";
import {
  RiseOutlined,
  CalendarOutlined,
  TagOutlined,
  TrophyOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import {
  useExpenses,
  useExpenseSummary,
  useExpenseCategories,
  useExpenseBudgets,
} from "@/modules/expenses/hooks/useExpenses";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import ExpenseMonthlyTrendChart from "@/modules/expenses/components/ExpenseMonthlyTrendChart";
import ExpenseCategoryPieChart from "@/modules/expenses/components/ExpenseCategoryPieChart";
import type { BudgetFormValues } from "@/modules/expenses/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const { Title, Text } = Typography;

// ─── Budget Panel ─────────────────────────────────────────────────────────────
function BudgetPanel({
  budgets,
  byCategory,
  loading,
  onEdit,
}: {
  budgets: { category: string; amount: number }[];
  byCategory: Record<string, number | undefined>;
  loading: boolean;
  onEdit: () => void;
}) {
  if (!budgets.length) {
    return (
      <Card size="small" title="Budget vs Actual" loading={loading} extra={<Button size="small" onClick={onEdit}>Set Budgets</Button>}
        styles={{ body: { minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" } }}
      >
        <Text type="secondary">No budgets set for this month.</Text>
      </Card>
    );
  }

  return (
    <Card
      title="Budget vs Actual"
      size="small"
      loading={loading}
      extra={<Button size="small" onClick={onEdit}>Edit</Button>}
      styles={{ body: { minHeight: 200, display: "flex", flexDirection: "column" } }}
    >
      {budgets.map((b) => {
        const actual = byCategory[b.category] ?? 0;
        const pct = b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0;
        const status = pct >= 100 ? "exception" : pct >= 90 ? "active" : "normal";
        const strokeColor = pct >= 100 ? "#ff4d4f" : pct >= 90 ? "#faad14" : "#52c41a";
        return (
          <div key={b.category} style={{ marginBottom: 16 }}>
            <Flex justify="space-between" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 13 }}>{b.category}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatCurrency(actual)} / {formatCurrency(b.amount)}
              </Text>
            </Flex>
            <Progress
              percent={Math.min(pct, 100)}
              status={status}
              strokeColor={strokeColor}
              size="small"
              format={(p) => `${p}%`}
            />
          </div>
        );
      })}
    </Card>
  );
}

// ─── Set Budgets Modal ────────────────────────────────────────────────────────
interface SetBudgetsModalProps {
  open: boolean;
  onClose: () => void;
  categories: { name: string }[];
  budgets: { category: string; amount: number }[];
  storeId: string;
  month: number;
  year: number;
  onSave: (values: BudgetFormValues) => Promise<void>;
}

function SetBudgetsModal({ open, onClose, categories, budgets, storeId, month, year, onSave }: SetBudgetsModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, b.amount]));

  const handleSave = async () => {
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      await Promise.all(
        categories
          .filter((c) => values[c.name] != null && Number(values[c.name]) > 0)
          .map((c) => onSave({ storeId, category: c.name, month, year, amount: Number(values[c.name]) }))
      );
      message.success("Budgets saved");
      onClose();
    } catch {
      message.error("Failed to save budgets");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} title="Set Monthly Budgets" onOk={handleSave} okText="Save Budgets" confirmLoading={saving} width={500} destroyOnHidden>
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        You&apos;ll be alerted when a category reaches 90% and 100% of its budget.
      </Text>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          {categories.map((cat) => (
            <Col span={12} key={cat.name}>
              <Form.Item name={cat.name} label={cat.name} initialValue={budgetMap[cat.name]}>
                <InputNumber style={{ width: "100%" }} prefix="₹" min={0} precision={0} placeholder="No limit" />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExpenseAnalyticsPage() {
  const { storeId } = useStore();
  const { user } = useCurrentUser();
  const { message } = App.useApp();
  const canModify = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState(now.year());
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const { expenses, loading } = useExpenses({
    storeId: storeId ?? undefined,
    month: selectedMonth,
    year: selectedYear,
  });

  const { summary, loading: summaryLoading } = useExpenseSummary(storeId, selectedYear);
  const { categories } = useExpenseCategories();
  const { budgets, loading: budgetsLoading, saveBudget, refresh: refreshBudgets } = useExpenseBudgets(
    storeId,
    selectedMonth,
    selectedYear
  );

  const monthTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCategoryThisMonth = useMemo(
    () => expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
    [expenses]
  );

  const topCategory = useMemo(() => {
    const entries = Object.entries(byCategoryThisMonth);
    if (!entries.length) return null;
    return entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  }, [byCategoryThisMonth]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((monthTotal / totalBudget) * 100), 100) : null;
  const monthLabel = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).format("MMM YYYY");

  const handleSaveBudget = async (values: BudgetFormValues) => {
    await saveBudget(values);
    await refreshBudgets();
    message.success("Budget saved");
  };

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ───────────────────────────────────── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Expense Analytics</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Deep dive into spending patterns · {monthLabel}
          </Text>
        </div>
        {canModify && (
          <Button onClick={() => setBudgetModalOpen(true)} disabled={!storeId}>
            🎯 Set Budgets
          </Button>
        )}
      </Flex>

      {/* ── Period selector ──────────────────────────── */}
      <Flex gap={12} align="center" style={{ marginBottom: 20 }}>
        <DatePicker.MonthPicker
          value={dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)}
          onChange={(date) => {
            if (date) { setSelectedMonth(date.month() + 1); setSelectedYear(date.year()); }
          }}
          format="MMM YYYY"
          allowClear={false}
        />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Showing analytics for <Text strong>{monthLabel}</Text>
        </Text>
      </Flex>

      {/* ── KPI cards ────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title={<Flex align="center" gap={6}><DollarOutlined style={{ color: "#4f46e5" }} /><span>Month Total</span></Flex>}
              value={monthTotal}
              formatter={(v) => formatCurrency(Number(v))}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{expenses.length} transactions</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={summaryLoading}>
            <Statistic
              title={<Flex align="center" gap={6}><CalendarOutlined style={{ color: "#10b981" }} /><span>Year Total ({selectedYear})</span></Flex>}
              value={summary?.grandTotal ?? 0}
              formatter={(v) => formatCurrency(Number(v))}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Jan–Dec {selectedYear}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={budgetsLoading}>
            <Statistic
              title={<Flex align="center" gap={6}><RiseOutlined style={{ color: budgetPct != null && budgetPct >= 90 ? "#f59e0b" : "#6366f1" }} /><span>Budget Used</span></Flex>}
              value={budgetPct ?? "—"}
              suffix={budgetPct != null ? "%" : ""}
              styles={{
                content: {
                  fontSize: 22, fontWeight: 700,
                  color: budgetPct != null && budgetPct >= 100 ? "#ef4444" : budgetPct != null && budgetPct >= 90 ? "#f59e0b" : undefined,
                },
              }}
            />
            {totalBudget > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(totalBudget - monthTotal)} remaining</Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>No budget set</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title={<Flex align="center" gap={6}><TrophyOutlined style={{ color: "#f59e0b" }} /><span>Top Category</span></Flex>}
              value={topCategory ? topCategory[0] : "—"}
              styles={{ content: { fontSize: 18, fontWeight: 700 } }}
            />
            {topCategory && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatCurrency(topCategory[1])} · {monthTotal > 0 ? Math.round((topCategory[1] / monthTotal) * 100) : 0}% of spend
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Charts ───────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <BudgetPanel
            budgets={budgets}
            byCategory={byCategoryThisMonth}
            loading={budgetsLoading}
            onEdit={() => setBudgetModalOpen(true)}
          />
        </Col>
        <Col xs={24} lg={8}>
          <ExpenseCategoryPieChart
            byCategory={summary?.byCategory ?? byCategoryThisMonth}
            loading={summaryLoading}
          />
        </Col>
        <Col xs={24} lg={8}>
          <ExpenseMonthlyTrendChart
            data={summary?.byMonth ?? []}
            loading={summaryLoading}
          />
        </Col>
      </Row>

      {/* ── Spend by category table ───────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title={`Category Breakdown — ${monthLabel}`} size="small" loading={loading}>
            {Object.entries(byCategoryThisMonth).length === 0 ? (
              <Text type="secondary">No expenses for {monthLabel}.</Text>
            ) : (
              <Row gutter={[12, 12]}>
                {Object.entries(byCategoryThisMonth)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => {
                    const pct = monthTotal > 0 ? Math.round((amount / monthTotal) * 100) : 0;
                    return (
                      <Col xs={24} sm={12} lg={8} key={cat}>
                        <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                          <Flex align="center" gap={6}>
                            <TagOutlined style={{ color: "#6366f1", fontSize: 12 }} />
                            <Text style={{ fontSize: 13 }}>{cat}</Text>
                          </Flex>
                          <Text strong style={{ fontSize: 13 }}>{formatCurrency(amount)}</Text>
                        </Flex>
                        <Progress
                          percent={pct}
                          showInfo={false}
                          strokeColor="#6366f1"
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>{pct}% of total</Text>
                      </Col>
                    );
                  })}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {storeId && (
        <SetBudgetsModal
          open={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          categories={categories}
          budgets={budgets}
          storeId={storeId}
          month={selectedMonth}
          year={selectedYear}
          onSave={handleSaveBudget}
        />
      )}
    </div>
  );
}
