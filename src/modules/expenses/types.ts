export type { ExpenseCategoryOption } from "./services/expenseCategoryService";

export const CATEGORY_COLOR_PALETTE = [
  "blue", "gold", "green", "cyan", "purple", "red", "orange", "magenta", "volcano", "lime", "geekblue",
] as const;
export type CategoryColorKey = typeof CATEGORY_COLOR_PALETTE[number] | "default";
export type ExpenseCategory = string;

export type ExpenseFormValues = {
  storeId: string;
  category: string;
  amount: number;
  date: string; // ISO date string: "YYYY-MM-DD"
  note?: string;
};

export type StoreExpense = {
  id: string;
  orgId: string;
  storeId: string;
  storeName: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListFilters = {
  storeId?: string;
  month?: number; // 1–12
  year?: number;
};

export type ExpenseCategoryTotals = Partial<Record<ExpenseCategory, number>>;

export type ExpenseMonthSummary = {
  month: string; // e.g. "2026-03"
  total: number;
  categories: ExpenseCategoryTotals;
};

export type ExpenseSummary = {
  year: number;
  storeId: string;
  grandTotal: number;
  byCategory: ExpenseCategoryTotals;
  byMonth: ExpenseMonthSummary[];
};
