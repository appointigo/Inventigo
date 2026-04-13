"use client";

import { useState, useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Modal,
  Popconfirm,
  Row,
  Select,
  Statistic,
  Tag,
  Typography,
  App,
  Form,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  DollarOutlined,
  CalendarOutlined,
  RiseOutlined,
  TrophyOutlined,
  RedoOutlined,
  DeleteOutlined,
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
import ExpenseForm from "@/modules/expenses/components/ExpenseForm";
import ExpenseTable from "@/modules/expenses/components/ExpenseTable";
import type { ExpenseFormValues, StoreExpense, BudgetFormValues } from "@/modules/expenses/types";
import { EXPENSE_STATUS } from "@/modules/expenses/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const { Title, Text } = Typography;

// ─── Color map for category badges ────────────────────────────────────────
const CATEGORY_COLOR_MAP: Record<string, string> = {
  blue: "blue",
  gold: "gold",
  green: "green",
  cyan: "cyan",
  purple: "purple",
  red: "red",
  orange: "orange",
  magenta: "magenta",
  volcano: "volcano",
  lime: "lime",
  geekblue: "geekblue",
  default: "default",
};

// ─── Recurring Modal ──────────────────────────────────────────────────────────
function RecurringModal({
  open,
  onClose,
  expenses,
  categories,
  onStopRecurring,
  onAddNew,
}: {
  open: boolean;
  onClose: () => void;
  expenses: StoreExpense[];
  categories: { id: string; name: string; colorKey: string }[];
  onStopRecurring: (id: string) => Promise<void>;
  onAddNew: () => void;
}) {
  const categoryColorMap = new Map(categories.map((c) => [c.name, c.colorKey]));
  const recurringExpenses = expenses.filter((e) => e.isRecurring);

  // Compute the next due date based on the expense's date and frequency
  function nextDueDate(expense: StoreExpense): string {
    const base = dayjs(expense.date);
    const freq = expense.recurrenceFreq;
    if (freq === "MONTHLY") return base.add(1, "month").format("DD MMM YYYY");
    if (freq === "QUARTERLY") return base.add(3, "month").format("DD MMM YYYY");
    if (freq === "ANNUALLY") return base.add(1, "year").format("DD MMM YYYY");
    return "—";
  }

  const freqLabel: Record<string, string> = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    ANNUALLY: "Annually",
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Flex align="center" gap={8}>
          <RedoOutlined style={{ color: "#6366f1" }} />
          <span>Recurring Expenses</span>
        </Flex>
      }
      footer={
        <Button onClick={onClose}>Done</Button>
      }
      width={580}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Auto-create draft entries every period. Review and approve them before they&apos;re counted.
      </Text>

      {recurringExpenses.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 13 }}>
          No recurring expenses set up yet. Toggle &ldquo;Recurring Expense&rdquo; when adding an expense.
        </Text>
      ) : (
        <Flex vertical gap={10}>
          {recurringExpenses.map((exp) => (
            <Flex
              key={exp.id}
              align="center"
              gap={14}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "#fafafa",
                border: "1px solid #f0f0f0",
              }}
            >
              <Tag
                color={CATEGORY_COLOR_MAP[categoryColorMap.get(exp.category) ?? "default"]}
                style={{ minWidth: 90, textAlign: "center", margin: 0 }}
              >
                {exp.category}
              </Tag>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {formatCurrency(exp.amount)} · {freqLabel[exp.recurrenceFreq ?? ""] ?? exp.recurrenceFreq}
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                  Next: {nextDueDate(exp)}
                </div>
              </div>
              <Tag
                color="success"
                style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "2px 10px" }}
              >
                Active
              </Tag>
              <Popconfirm
                title="Stop recurring?"
                description="This expense will no longer auto-generate."
                onConfirm={() => onStopRecurring(exp.id)}
                okText="Stop"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  type="text"
                  danger
                />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      )}

      <div
        onClick={() => { onClose(); onAddNew(); }}
        style={{
          marginTop: 16,
          padding: "14px 16px",
          borderRadius: 10,
          border: "2px dashed #d9d9d9",
          textAlign: "center",
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d9d9d9")}
      >
        <Text type="secondary" style={{ fontSize: 13.5 }}>＋ Add new recurring template</Text>
      </div>
    </Modal>
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
          .map((c) =>
            onSave({ storeId, category: c.name, month, year, amount: Number(values[c.name]) })
          )
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
      title="Set Monthly Budgets"
      onOk={handleSave}
      okText="Save Budgets"
      confirmLoading={saving}
      width={500}
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        You&apos;ll be alerted when a category reaches 90% and 100% of its budget.
      </Text>
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          {categories.map((cat) => (
            <Col span={12} key={cat.name}>
              <Form.Item
                name={cat.name}
                label={cat.name}
                initialValue={budgetMap[cat.name]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  prefix="₹"
                  min={0}
                  precision={0}
                  placeholder="No limit"
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { storeId } = useStore();
  const { user } = useCurrentUser();
  const { message } = App.useApp();

  const canModify = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.year());

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { expenses, loading, refresh } = useExpenses({
    storeId: storeId ?? undefined,
    month: selectedMonth,
    year: selectedYear,
  });

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useExpenseSummary(
    storeId,
    selectedYear
  );

  const { categories, addCategory, removeCategory } = useExpenseCategories();

  const { budgets, saveBudget, refresh: refreshBudgets } = useExpenseBudgets(
    storeId,
    selectedMonth,
    selectedYear
  );

  // KPI computations
  const monthTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCategoryThisMonth = useMemo(
    () =>
      expenses.reduce<Record<string, number>>((acc, e) => {
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

  const pendingCount = useMemo(
    () => expenses.filter((e) => e.status === "PENDING").length,
    [expenses]
  );

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((monthTotal / totalBudget) * 100), 100) : null;

  const filteredExpenses = useMemo(
    () => statusFilter ? expenses.filter((e) => e.status === statusFilter) : expenses,
    [expenses, statusFilter]
  );

  // Handlers
  const handleOpenAdd = () => { setEditTarget(null); setFormOpen(true); };
  const handleOpenEdit = (expense: StoreExpense) => { setEditTarget(expense); setFormOpen(true); };
  const handleClose = () => { setFormOpen(false); setEditTarget(null); };

  const handleSubmit = async (values: ExpenseFormValues) => {
    if (!storeId) return;
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await fetch(`/api/expenses/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error("Failed to update expense");
        message.success("Expense updated");
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, storeId }),
        });
        if (!res.ok) throw new Error("Failed to add expense");
        message.success("Expense added");
      }
      handleClose();
      await Promise.all([refresh(), refreshSummary(), refreshBudgets()]);
    } catch {
      message.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      message.success("Expense deleted");
      await Promise.all([refresh(), refreshSummary(), refreshBudgets()]);
    } catch {
      message.error("Failed to delete expense");
    }
  };

  const handleStopRecurring = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: false, recurrenceFreq: null }),
      });
      if (!res.ok) throw new Error("Update failed");
      message.success("Recurring stopped");
      await Promise.all([refresh(), refreshSummary(), refreshBudgets()]);
    } catch {
      message.error("Failed to stop recurring");
    }
  };

  const handleSaveBudget = async (values: BudgetFormValues) => {
    await saveBudget(values);
  };

  const monthLabel = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).format("MMM YYYY");

  return (
    <div style={{ padding: 24 }}>
      {/* ── Page header ──────────────────────────────── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Store Expenses</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Track, analyse and control every rupee spent
          </Text>
        </div>
        <Flex gap={8}>
          <Button onClick={() => setBudgetModalOpen(true)} disabled={!storeId}>
            🎯 Set Budgets
          </Button>
          <Button
            icon={<RedoOutlined />}
            onClick={() => setRecurringOpen(true)}
            disabled={!storeId}
          >
            Recurring
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAdd}
            disabled={!storeId}
          >
            Add Expense
          </Button>
        </Flex>
      </Flex>

      {/* ── Pending banner ───────────────────────────── */}
      {pendingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Text strong>
              {pendingCount} expense{pendingCount > 1 ? "s" : ""} pending approval
            </Text>
          }
          description="Expenses added by Managers are pending your review before counting towards totals."
          action={
            <Button size="small" type="primary" ghost>
              Review
            </Button>
          }
        />
      )}

      {/* ── Period selector ──────────────────────────── */}
      <Flex gap={12} align="center" style={{ marginBottom: 20 }}>
        <DatePicker.MonthPicker
          value={dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)}
          onChange={(date) => {
            if (date) {
              setSelectedMonth(date.month() + 1);
              setSelectedYear(date.year());
            }
          }}
          format="MMM YYYY"
          allowClear={false}
        />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Showing data for <Text strong>{monthLabel}</Text>
        </Text>
      </Flex>

      {/* ── KPI cards ────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={
                <Flex align="center" gap={6}>
                  <DollarOutlined style={{ color: "#4f46e5" }} />
                  <span>Month Total</span>
                </Flex>
              }
              value={monthTotal}
              formatter={(v) => formatCurrency(Number(v))}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {expenses.length} transactions
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={
                <Flex align="center" gap={6}>
                  <CalendarOutlined style={{ color: "#10b981" }} />
                  <span>Year Total ({selectedYear})</span>
                </Flex>
              }
              value={summary?.grandTotal ?? 0}
              formatter={(v) => formatCurrency(Number(v))}
              loading={summaryLoading}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Jan–Dec {selectedYear}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={
                <Flex align="center" gap={6}>
                  <RiseOutlined style={{ color: budgetPct != null && budgetPct >= 90 ? "#f59e0b" : "#6366f1" }} />
                  <span>Budget Used</span>
                </Flex>
              }
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatCurrency(totalBudget - monthTotal)} remaining
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>No budget set</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={
                <Flex align="center" gap={6}>
                  <TrophyOutlined style={{ color: "#f59e0b" }} />
                  <span>Top Category</span>
                </Flex>
              }
              value={topCategory ? topCategory[0] : "—"}
              styles={{ content: { fontSize: 18, fontWeight: 700 } }}
            />
            {topCategory && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatCurrency(topCategory[1])} ·{" "}
                {monthTotal > 0 ? Math.round((topCategory[1] / monthTotal) * 100) : 0}% of spend
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Transactions table ────────────────────── */}
      <Card
        size="small"
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <Text strong>Expenses — {monthLabel}</Text>
              {pendingCount > 0 && (
                <Badge count={pendingCount} size="small" />
              )}
            </Flex>
            <Select
              size="small"
              style={{ width: 140 }}
              placeholder="Filter status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(EXPENSE_STATUS).map(([k, v]) => ({
                value: k,
                label: <Badge status={v.color} text={v.label} />,
              }))}
            />
          </Flex>
        }
      >
        <ExpenseTable
          expenses={filteredExpenses}
          loading={loading}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          categories={categories}
          canModify={canModify}
        />
      </Card>

      {/* ── Expense form modal ───────────────────────── */}
      {storeId && (
        <>
          <ExpenseForm
            open={formOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            initialValues={editTarget}
            storeId={storeId}
            loading={submitting}
            categories={categories}
            onAddCategory={addCategory}
            onDeleteCategory={removeCategory}
            canManageCategories={canModify}
          />
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
          <RecurringModal
            open={recurringOpen}
            onClose={() => setRecurringOpen(false)}
            expenses={expenses}
            categories={categories}
            onStopRecurring={handleStopRecurring}
            onAddNew={handleOpenAdd}
          />
        </>
      )}
    </div>
  );
}

