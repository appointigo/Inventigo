import { prisma } from "@/lib/db";
import type { ExpenseBudget } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (b: any): ExpenseBudget => ({
  id: b.id,
  orgId: b.orgId,
  storeId: b.storeId,
  category: b.category,
  month: b.month,
  year: b.year,
  amount: Number(b.amount),
});

export const expenseBudgetService = {
  async list(storeId: string, orgId: string, month: number, year: number): Promise<ExpenseBudget[]> {
    const rows = await prisma.expenseBudget.findMany({
      where: { storeId, orgId, month, year },
      orderBy: { category: "asc" },
    });
    return rows.map(toDto);
  },

  async upsert(
    storeId: string,
    orgId: string,
    category: string,
    month: number,
    year: number,
    amount: number
  ): Promise<ExpenseBudget> {
    const row = await prisma.expenseBudget.upsert({
      where: { storeId_category_month_year: { storeId, category, month, year } },
      update: { amount },
      create: { orgId, storeId, category, month, year, amount },
    });
    return toDto(row);
  },

  async remove(id: string, orgId: string): Promise<boolean> {
    const existing = await prisma.expenseBudget.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.expenseBudget.delete({ where: { id } });
    return true;
  },
};
