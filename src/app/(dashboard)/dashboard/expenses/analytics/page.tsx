"use client";

import { useMemo, useState } from "react";
import {
  AimOutlined,
  BarChartOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  PieChartOutlined,
  TrophyOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Progress,
  Row,
  Col,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import ExpenseCategorySpendChart from "@/modules/expenses/components/ExpenseCategorySpendChart";
import ExpenseMonthlyTrendChart from "@/modules/expenses/components/ExpenseMonthlyTrendChart";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import {
  useExpenseBudgets,
  useExpenseCategories,
  useExpenses,
  useExpenseSummary,
} from "@/modules/expenses/hooks/useExpenses";
import type { BudgetFormValues, ExpenseCategoryTotals } from "@/modules/expenses/types";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./page.module.css";

const { Text, Title } = Typography;

function InfoTip({ title }: { title: string }) {
  return (
    <Tooltip title={title}>
      <InfoCircleOutlined className={styles.infoIcon} aria-label={title} />
    </Tooltip>
  );
}

function CardTitle({
  children,
  icon,
  help,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  help: string;
}) {
  return (
    <span className={styles.cardTitle}>
      <span className={styles.titleIcon}>{icon}</span>
      {children}
      <InfoTip title={help} />
    </span>
  );
}

function KpiCard({
  label,
  help,
  icon,
  iconTone,
  value,
  meta,
  loading,
  categoryValue = false,
  action,
}: {
  label: React.ReactNode;
  help: string;
  icon: React.ReactNode;
  iconTone: "blue" | "green" | "amber";
  value: React.ReactNode;
  meta: React.ReactNode;
  loading: boolean;
  categoryValue?: boolean;
  action?: React.ReactNode;
}) {
  const toneClass = iconTone === "green" ? styles.iconGreen : iconTone === "amber" ? styles.iconAmber : styles.iconBlue;

  return (
    <Card className={styles.kpiCard} loading={loading}>
      <div className={styles.kpiHeader}>
        <span className={`${styles.kpiIcon} ${toneClass}`}>{icon}</span>
        <span className={styles.kpiLabel}>{label}</span>
        <InfoTip title={help} />
      </div>
      <div className={`${styles.kpiValue} ${categoryValue ? styles.categoryValue : ""}`}>{value}</div>
      <span className={styles.kpiMeta}>{meta}</span>
      {action}
    </Card>
  );
}

function BudgetPanel({
  budgets,
  byCategory,
  loading,
  canModify,
  onEdit,
}: {
  budgets: { category: string; amount: number }[];
  byCategory: ExpenseCategoryTotals;
  loading: boolean;
  canModify: boolean;
  onEdit: () => void;
}) {
  return (
    <Card
      className={styles.panelCard}
      loading={loading}
      title={
        <CardTitle icon={<PieChartOutlined />} help="Compare this month’s category spending with its budget.">
          Budget vs Actual
        </CardTitle>
      }
      extra={budgets.length > 0 && canModify ? <Button size="small" onClick={onEdit}>Edit</Button> : null}
    >
      {budgets.length === 0 ? (
        <div className={styles.budgetEmpty}>
          <span className={styles.budgetEmptyIcon}><AimOutlined /></span>
          <div className={styles.budgetEmptyTitle}>No budgets set for this month</div>
          <div className={styles.budgetEmptyCopy}>Set category-wise budgets to track spending against your plan.</div>
          {canModify && <Button type="primary" size="small" onClick={onEdit}>Set Budgets</Button>}
        </div>
      ) : (
        <div className={styles.budgetList}>
          {budgets.map((budget) => {
            const actual = byCategory[budget.category] ?? 0;
            const percentage = budget.amount > 0 ? Math.round((actual / budget.amount) * 100) : 0;
            const color = percentage >= 100 ? "#ef4444" : percentage >= 90 ? "#e9a11b" : "#3478f6";

            return (
              <div key={budget.category}>
                <div className={styles.budgetRowHeader}>
                  <span className={styles.budgetName}>{budget.category}</span>
                  <span className={styles.budgetAmounts}>{formatCurrency(actual)} / {formatCurrency(budget.amount)}</span>
                </div>
                <Progress percent={Math.min(percentage, 100)} strokeColor={color} size="small" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

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
  const budgetMap = Object.fromEntries(budgets.map((budget) => [budget.category, budget.amount]));

  const handleSave = async () => {
    const values = form.getFieldsValue() as Record<string, number | undefined>;
    setSaving(true);
    try {
      await Promise.all(
        categories
          .filter((category) => values[category.name] != null && Number(values[category.name]) > 0)
          .map((category) => onSave({
            storeId,
            category: category.name,
            month,
            year,
            amount: Number(values[category.name]),
          })),
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
    <Modal
      open={open}
      onCancel={onClose}
      title={`Set Monthly Budgets — ${dayjs(`${year}-${String(month).padStart(2, "0")}-01`).format("MMM YYYY")}`}
      onOk={handleSave}
      okText="Save Budgets"
      confirmLoading={saving}
      width={520}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Set category-wise limits for the selected month.
      </Text>
      <Form form={form} layout="vertical" key={`${year}-${month}-${budgets.map((budget) => `${budget.category}:${budget.amount}`).join("|")}`}>
        <Row gutter={12}>
          {categories.map((category) => (
            <Col xs={24} sm={12} key={category.name}>
              <Form.Item name={category.name} label={category.name} initialValue={budgetMap[category.name]}>
                <InputNumber style={{ width: "100%" }} prefix="₹" min={0} precision={0} placeholder="No limit" />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
}

export default function ExpenseAnalyticsPage() {
  const { storeId } = useStore();
  const { user } = useCurrentUser();
  const currentMonth = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.month() + 1);
  const [selectedYear, setSelectedYear] = useState(currentMonth.year());
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const canModify = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const selectedMonthDate = useMemo(
    () => dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`),
    [selectedMonth, selectedYear],
  );
  const selectedMonthStart = selectedMonthDate.startOf("month").format("YYYY-MM-DD");
  const selectedMonthEnd = selectedMonthDate.endOf("month").format("YYYY-MM-DD");
  const monthLabel = selectedMonthDate.format("MMM YYYY");

  // Month-scoped contract: this request is the single source for all selected-month metrics.
  const { expenses: monthExpenses, loading: monthLoading } = useExpenses({
    storeId: storeId ?? undefined,
    startDate: selectedMonthStart,
    endDate: selectedMonthEnd,
  });

  // Year-scoped contract: the annual summary only powers Year Total and Monthly Expense Trend.
  const { summary: yearSummary, loading: yearLoading } = useExpenseSummary(storeId, selectedYear);
  const { categories } = useExpenseCategories();
  const { budgets, loading: budgetsLoading, saveBudget, refresh: refreshBudgets } = useExpenseBudgets(
    storeId,
    selectedMonth,
    selectedYear,
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((total, expense) => total + expense.amount, 0),
    [monthExpenses],
  );
  const monthByCategory = useMemo<ExpenseCategoryTotals>(() => {
    return monthExpenses.reduce<ExpenseCategoryTotals>((totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    }, {});
  }, [monthExpenses]);
  const sortedCategories = useMemo(
    () => Object.entries(monthByCategory)
      .map(([category, amount]) => ({ category, amount: amount ?? 0 }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
    [monthByCategory],
  );
  const topCategory = sortedCategories[0] ?? null;
  const totalBudget = budgets.reduce((total, budget) => total + budget.amount, 0);
  const budgetPercentage = totalBudget > 0 ? Math.round((monthTotal / totalBudget) * 100) : null;

  const openBudgetModal = () => setBudgetModalOpen(true);
  const handleSaveBudget = async (values: BudgetFormValues) => {
    const saved = await saveBudget(values);
    if (!saved) throw new Error("Budget could not be saved");
    await refreshBudgets();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.headingRow}>
            <Title level={3} className={styles.heading}>Expense Analytics</Title>
            <InfoTip title="A focused view of expense patterns, budgets, and categories." />
          </div>
          <span className={styles.subtitle}>Deep dive into spending patterns · {monthLabel}</span>
        </div>
        {canModify && (
          <Button className={styles.budgetButton} type="primary" icon={<AimOutlined />} onClick={openBudgetModal} disabled={!storeId}>
            Set Budgets
          </Button>
        )}
      </header>

      <section className={styles.periodBar} aria-label="Analytics period">
        <DatePicker.MonthPicker
          className={styles.periodPicker}
          value={selectedMonthDate}
          onChange={(date) => {
            if (!date) return;
            setSelectedMonth(date.month() + 1);
            setSelectedYear(date.year());
          }}
          format="MMM YYYY"
          allowClear={false}
        />
        <span className={styles.periodHelp}>Showing analytics for <strong>{monthLabel}</strong></span>
      </section>

      <section className={styles.kpiGrid} aria-label="Expense summary">
        <KpiCard
          label="Month Total"
          help="Expenses recorded in the selected month."
          icon={<WalletOutlined />}
          iconTone="blue"
          value={formatCurrency(monthTotal)}
          meta={`${monthExpenses.length} ${monthExpenses.length === 1 ? "transaction" : "transactions"}`}
          loading={monthLoading}
        />
        <KpiCard
          label={`Year Total (${selectedYear})`}
          help="Total expenses recorded during the selected year."
          icon={<CalendarOutlined />}
          iconTone="green"
          value={formatCurrency(yearSummary?.grandTotal ?? 0)}
          meta={`Jan – Dec ${selectedYear}`}
          loading={yearLoading}
        />
        <KpiCard
          label="Budget Used"
          help="How much of your monthly budget has been spent."
          icon={<PieChartOutlined />}
          iconTone="blue"
          value={budgetPercentage == null ? "—" : `${budgetPercentage}%`}
          meta={budgetPercentage == null ? "No budget set" : `${formatCurrency(Math.max(totalBudget - monthTotal, 0))} remaining`}
          loading={budgetsLoading || monthLoading}
          action={budgetPercentage == null && canModify ? (
            <Button className={styles.kpiAction} size="small" onClick={openBudgetModal}>Set Budgets</Button>
          ) : undefined}
        />
        <KpiCard
          label="Top Category"
          help="The category with the highest spend in the selected month."
          icon={<TrophyOutlined />}
          iconTone="amber"
          value={topCategory?.category ?? "—"}
          meta={topCategory ? `${formatCurrency(topCategory.amount)} · ${monthTotal > 0 ? Math.round((topCategory.amount / monthTotal) * 100) : 0}% of spend` : "No expense data"}
          loading={monthLoading}
          categoryValue
        />
      </section>

      <section className={styles.analyticsGrid} aria-label="Expense charts">
        <ExpenseCategorySpendChart byCategory={monthByCategory} loading={monthLoading} monthLabel={monthLabel} />
        <BudgetPanel
          budgets={budgets}
          byCategory={monthByCategory}
          loading={budgetsLoading || monthLoading}
          canModify={canModify}
          onEdit={openBudgetModal}
        />
        <div className={styles.trendPanel}>
          <ExpenseMonthlyTrendChart data={yearSummary?.byMonth ?? []} loading={yearLoading} year={selectedYear} />
        </div>
      </section>

      <section className={styles.breakdown}>
        <Card
          className={styles.panelCard}
          loading={monthLoading}
          title={
            <CardTitle icon={<BarChartOutlined />} help="A reconciled category view of expenses in the selected month.">
              Category Breakdown — {monthLabel}
            </CardTitle>
          }
        >
          {sortedCategories.length === 0 ? (
            <div className={styles.emptyBreakdown}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expense data for this month." />
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Category</th>
                    <th scope="col">Amount (₹)</th>
                    <th scope="col">% of Total</th>
                    <th scope="col">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((item, index) => {
                    const percentage = monthTotal > 0 ? (item.amount / monthTotal) * 100 : 0;
                    const percentageLabel = percentage.toFixed(percentage % 1 === 0 ? 0 : 1);
                    return (
                      <tr key={item.category}>
                        <td>{index + 1}</td>
                        <td className={styles.categoryCell}>{item.category}</td>
                        <td className={styles.amountCell}>{formatCurrency(item.amount)}</td>
                        <td>{percentageLabel}%</td>
                        <td>
                          <div className={styles.visualCell}>
                            <span className={styles.visualTrack} aria-hidden="true">
                              <span className={styles.visualBar} style={{ width: `${percentage}%` }} />
                            </span>
                            <span className={styles.visualPercent}>{percentageLabel}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={styles.totalRow}>
                    <td colSpan={2}>Total</td>
                    <td>{formatCurrency(monthTotal)}</td>
                    <td>100%</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

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
    </main>
  );
}
