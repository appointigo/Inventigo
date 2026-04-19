"use client";

import { useMemo } from "react";
import { Tabs } from "antd";
import { DollarOutlined, ThunderboltOutlined, TeamOutlined, BarChartOutlined, TagsOutlined } from "@ant-design/icons";
import type { StoreExpense, ExpenseSummary } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import PettyCashTab from "./tabs/PettyCashTab";
import UtilityTab from "./tabs/UtilityTab";
import StaffClaimsTab from "./tabs/StaffClaimsTab";
import PLViewTab from "./tabs/PLViewTab";
import CategoryManagerTab from "./tabs/CategoryManagerTab";
interface Props {
  expenses: StoreExpense[];
  categories: ExpenseCategoryOption[];
  onAddCategory: (name: string, colorKey: string) => Promise<ExpenseCategoryOption | null>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  canModify: boolean;
  monthLabel: string;
  selectedMonth: number;
  selectedYear: number;
  summary: ExpenseSummary | null;
}

/**
 * ExpenseAdvancedTab Component
 * 
 * Main tab container for advanced expense features:
 * - Petty Cash Ledger
 * - Utility Tracking
 * - Staff Claims
 * - P&L View
 * - Category Manager
 * 
 * Modular structure with separate tab components for scalability
 */
const ExpenseAdvancedTab = ({ expenses, categories, onAddCategory, onDeleteCategory, canModify, monthLabel, selectedMonth, selectedYear, summary }: Props) => {
  const tabItems = useMemo(
    () => [
      {
        key: "petty",
        label: (
          <span>
            <DollarOutlined /> Petty Cash Ledger
          </span>
        ),
        children: <PettyCashTab expenses={expenses} monthLabel={monthLabel} />,
      },
      {
        key: "utility",
        label: (
          <span>
            <ThunderboltOutlined /> Utility Tracking
          </span>
        ),
        children: <UtilityTab expenses={expenses} monthLabel={monthLabel} />,
      },
      {
        key: "claims",
        label: (
          <span>
            <TeamOutlined /> Staff Claims
          </span>
        ),
        children: <StaffClaimsTab canModify={canModify} />,
      },
      {
        key: "pnl",
        label: (
          <span>
            <BarChartOutlined /> P&L View (Profit & Loss)
          </span>
        ),
        children: (
          <PLViewTab
            expenses={expenses}
            summary={summary}
            monthLabel={monthLabel}
            selectedYear={selectedYear}
          />
        ),
      },
      {
        key: "categories",
        label: (
          <span>
            <TagsOutlined /> Category Manager
          </span>
        ),
        children: (
          <CategoryManagerTab
            categories={categories}
            expenses={expenses}
            onAddCategory={onAddCategory}
            onDeleteCategory={onDeleteCategory}
            canModify={canModify}
          />
        ),
      },
    ],
    [
      expenses,
      categories,
      monthLabel,
      summary,
      selectedYear,
      canModify,
      onAddCategory,
      onDeleteCategory,
    ]
  );

  return (
    <Tabs
      defaultActiveKey="petty"
      type="line"
      items={tabItems}
      style={{ background: "#fff", borderRadius: 8, padding: "0 16px 16px" }}
    />
  );
};

export default ExpenseAdvancedTab;
