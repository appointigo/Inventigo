import { prisma } from "@/lib/db";
import type {
  ExpenseFormValues,
  StoreExpense,
  ExpenseListFilters,
  ExpenseSummary,
  ExpenseCategoryTotals,
  ExpenseMonthSummary,
  ExpenseCategory,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (e: any): StoreExpense => ({
  id: e.id,
  orgId: e.orgId,
  storeId: e.storeId,
  storeName: e.store.name,
  category: e.category,
  amount: Number(e.amount),
  date: e.date instanceof Date ? e.date.toISOString().split("T")[0] : e.date,
  note: e.note ?? null,
  createdBy: e.createdBy,
  createdByName: e.user.name,
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString(),
});

const expenseInclude = {
  store: { select: { name: true } },
  user: { select: { name: true } },
} as const;

function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { gte: start, lt: end };
}

export const expenseService = {
  async list(filters: ExpenseListFilters, orgId: string): Promise<StoreExpense[]> {
    const dateFilter =
      filters.month && filters.year
        ? monthRange(filters.year, filters.month)
        : filters.year
          ? { gte: new Date(Date.UTC(filters.year, 0, 1)), lt: new Date(Date.UTC(filters.year + 1, 0, 1)) }
          : undefined;

    const rows = await prisma.storeExpense.findMany({
      where: {
        orgId,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(dateFilter && { date: dateFilter }),
      },
      include: expenseInclude,
      orderBy: { date: "desc" },
    });
    return rows.map(toDto);
  },

  async getById(id: string, orgId: string): Promise<StoreExpense | null> {
    const row = await prisma.storeExpense.findFirst({
      where: { id, orgId },
      include: expenseInclude,
    });
    return row ? toDto(row) : null;
  },

  async create(values: ExpenseFormValues, userId: string, orgId: string): Promise<StoreExpense> {
    const row = await prisma.storeExpense.create({
      data: {
        orgId,
        storeId: values.storeId,
        category: values.category,
        amount: values.amount,
        date: new Date(values.date),
        note: values.note ?? null,
        createdBy: userId,
      },
      include: expenseInclude,
    });
    return toDto(row);
  },

  async update(
    id: string,
    orgId: string,
    values: Partial<Omit<ExpenseFormValues, "storeId">>
  ): Promise<StoreExpense | null> {
    const existing = await prisma.storeExpense.findFirst({ where: { id, orgId } });
    if (!existing) return null;

    const row = await prisma.storeExpense.update({
      where: { id },
      data: {
        ...(values.category !== undefined && { category: values.category }),
        ...(values.amount !== undefined && { amount: values.amount }),
        ...(values.date !== undefined && { date: new Date(values.date) }),
        ...(values.note !== undefined && { note: values.note ?? null }),
      },
      include: expenseInclude,
    });
    return toDto(row);
  },

  async remove(id: string, orgId: string): Promise<boolean> {
    const existing = await prisma.storeExpense.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.storeExpense.delete({ where: { id } });
    return true;
  },

  async summary(storeId: string, orgId: string, year: number): Promise<ExpenseSummary> {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await prisma.storeExpense.findMany({
      where: {
        orgId,
        storeId,
        date: { gte: yearStart, lt: yearEnd },
      },
      select: { category: true, amount: true, date: true },
    });

    const byCategory: ExpenseCategoryTotals = {};
    const monthMap: Map<string, { total: number; categories: ExpenseCategoryTotals }> = new Map();

    for (const row of rows) {
      const amt = Number(row.amount);
      const cat = row.category as ExpenseCategory;
      const d = row.date instanceof Date ? row.date : new Date(row.date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      // category totals
      byCategory[cat] = (byCategory[cat] ?? 0) + amt;

      // monthly totals
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { total: 0, categories: {} });
      }
      const m = monthMap.get(monthKey)!;
      m.total += amt;
      m.categories[cat] = (m.categories[cat] ?? 0) + amt;
    }

    const byMonth: ExpenseMonthSummary[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const grandTotal = (Object.values(byCategory) as (number | undefined)[]).reduce<number>((sum, v) => sum + (v ?? 0), 0);

    return { year, storeId, grandTotal, byCategory, byMonth };
  },
};
