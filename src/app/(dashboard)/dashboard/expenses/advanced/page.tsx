"use client";

import { useState } from "react";
import { DatePicker, Flex, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import {
  useExpenses,
  useExpenseSummary,
  useExpenseCategories,
} from "@/modules/expenses/hooks/useExpenses";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import ExpenseAdvancedTab from "@/modules/expenses/components/ExpenseAdvancedTab";

const { Title, Text } = Typography;

export default function ExpenseAdvancedPage() {
  const { storeId } = useStore();
  const { user } = useCurrentUser();
  const canModify = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState(now.year());

  const { expenses } = useExpenses({
    storeId: storeId ?? undefined,
    month: selectedMonth,
    year: selectedYear,
  });

  const { summary } = useExpenseSummary(storeId, selectedYear);
  const { categories, addCategory, removeCategory } = useExpenseCategories();

  const monthLabel = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).format("MMM YYYY");

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ───────────────────────────────────── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ExperimentOutlined style={{ marginRight: 8, color: "#7c3aed" }} />
            Advanced Features
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Petty Cash · Utility Tracking · Staff Claims · P&amp;L · Category Management
          </Text>
        </div>
        <DatePicker.MonthPicker
          value={dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)}
          onChange={(date) => {
            if (date) { setSelectedMonth(date.month() + 1); setSelectedYear(date.year()); }
          }}
          format="MMM YYYY"
          allowClear={false}
        />
      </Flex>

      <ExpenseAdvancedTab
        expenses={expenses}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={removeCategory}
        canModify={canModify}
        monthLabel={monthLabel}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        summary={summary}
      />
    </div>
  );
}
