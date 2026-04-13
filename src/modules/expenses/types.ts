export type { ExpenseCategoryOption } from "./services/expenseCategoryService";

export const CATEGORY_COLOR_PALETTE = [
  "blue", "gold", "green", "cyan", "purple", "red", "orange", "magenta", "volcano", "lime", "geekblue",
] as const;
export type CategoryColorKey = typeof CATEGORY_COLOR_PALETTE[number] | "default";
export type ExpenseCategory = string;

// ─── Payment / Recurrence / GST constants ───────────────────────────────────

export const PAYMENT_MODES = [
  { value: "CASH",          label: "Cash",            icon: "💵" },
  { value: "UPI",           label: "UPI",             icon: "📱" },
  { value: "BANK_TRANSFER", label: "Bank Transfer",   icon: "🏦" },
  { value: "CHEQUE",        label: "Cheque",          icon: "📄" },
  { value: "CREDIT_CARD",   label: "Credit Card",     icon: "💳" },
  { value: "PETTY_CASH",    label: "Petty Cash",      icon: "🪙" },
] as const;
export type PaymentModeValue = typeof PAYMENT_MODES[number]["value"];

export const RECURRENCE_FREQS = [
  { value: "MONTHLY",   label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY",  label: "Annually" },
] as const;
export type RecurrenceFreqValue = typeof RECURRENCE_FREQS[number]["value"];

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = typeof GST_RATES[number];

export const EXPENSE_STATUS = {
  APPROVED: { label: "Approved", color: "success" as const },
  PENDING:  { label: "Pending",  color: "warning" as const },
  REJECTED: { label: "Rejected", color: "error"   as const },
};

// ─── Form & model types ──────────────────────────────────────────────────────

export type ExpenseFormValues = {
  storeId: string;
  category: string;
  amount: number;
  date: string; // ISO date string: "YYYY-MM-DD"
  note?: string;
  paymentMode?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceFreq?: string;
  // GST fields
  vendorGstin?: string;
  gstRate?: number;
  gstAmount?: number;
  isItcEligible?: boolean;
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
  paymentMode: string | null;
  receiptUrl: string | null;
  status: string;
  isRecurring: boolean;
  recurrenceFreq: string | null;
  vendorGstin: string | null;
  gstRate: number | null;
  gstAmount: number | null;
  isItcEligible: boolean;
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

// ─── Budget types ─────────────────────────────────────────────────────────────

export type ExpenseBudget = {
  id: string;
  orgId: string;
  storeId: string;
  category: string;
  month: number;
  year: number;
  amount: number;
};

export type BudgetFormValues = {
  storeId: string;
  category: string;
  month: number;
  year: number;
  amount: number;
};
