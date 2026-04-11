"use client";

import { useState } from "react";
import {
  Button,
  Col,
  DatePicker,
  Flex,
  Row,
  Statistic,
  Typography,
  App,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import { useExpenses, useExpenseSummary, useExpenseCategories } from "@/modules/expenses/hooks/useExpenses";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import ExpenseForm from "@/modules/expenses/components/ExpenseForm";
import ExpenseTable from "@/modules/expenses/components/ExpenseTable";
import ExpenseMonthlyTrendChart from "@/modules/expenses/components/ExpenseMonthlyTrendChart";
import ExpenseCategoryPieChart from "@/modules/expenses/components/ExpenseCategoryPieChart";
import type { ExpenseFormValues, StoreExpense } from "@/modules/expenses/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

export default function ExpensesPage() {
  const { storeId } = useStore();
  const { user } = useCurrentUser();
  const { message } = App.useApp();

  const canModify = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const canManageCategories = canModify;

  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.year());

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (expense: StoreExpense) => {
    setEditTarget(expense);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

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
      await Promise.all([refresh(), refreshSummary()]);
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
      await Promise.all([refresh(), refreshSummary()]);
    } catch {
      message.error("Failed to delete expense");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Store Expenses
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          disabled={!storeId}
        >
          Add Expense
        </Button>
      </Flex>

      {/* Filters */}
      <Flex gap={12} style={{ marginBottom: 20 }}>
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
        <Statistic
          title="Month Total"
          value={monthTotal}
          formatter={(val) => formatCurrency(Number(val))}
          style={{ minWidth: 140 }}
        />
        {summary && (
          <Statistic
            title="Year Total"
            value={summary.grandTotal}
            formatter={(val) => formatCurrency(Number(val))}
            style={{ minWidth: 140 }}
          />
        )}
      </Flex>

      {/* Table */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        categories={categories}
        canModify={canModify}
      />

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={14}>
          <ExpenseMonthlyTrendChart
            data={summary?.byMonth ?? []}
            loading={summaryLoading}
          />
        </Col>
        <Col xs={24} lg={10}>
          <ExpenseCategoryPieChart
            byCategory={summary?.byCategory ?? {}}
            loading={summaryLoading}
          />
        </Col>
      </Row>

      {/* Add / Edit Modal */}
      <ExpenseForm
        open={formOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialValues={editTarget}
        storeId={storeId ?? ""}
        loading={submitting}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={removeCategory}
        canManageCategories={canManageCategories}
      />
    </div>
  );
}
