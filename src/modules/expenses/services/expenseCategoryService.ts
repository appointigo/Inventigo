import { prisma } from "@/lib/db";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Rent", colorKey: "blue" },
  { name: "Electricity", colorKey: "gold" },
  { name: "Employee Salary", colorKey: "green" },
  { name: "Cleaning", colorKey: "cyan" },
  { name: "Miscellaneous", colorKey: "default" },
  { name: "Stationery", colorKey: "purple" },
];

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  colorKey: string;
};

export const expenseCategoryService = {
  async list(orgId: string): Promise<ExpenseCategoryOption[]> {
    const rows = await prisma.expenseCategoryOption.findMany({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, colorKey: true },
    });
    return rows;
  },

  async create(
    orgId: string,
    name: string,
    colorKey = "default"
  ): Promise<ExpenseCategoryOption> {
    const row = await prisma.expenseCategoryOption.create({
      data: { orgId, name: name.trim(), colorKey },
      select: { id: true, name: true, colorKey: true },
    });
    return row;
  },

  async remove(id: string, orgId: string): Promise<boolean> {
    const existing = await prisma.expenseCategoryOption.findFirst({
      where: { id, orgId },
    });
    if (!existing) return false;
    await prisma.expenseCategoryOption.delete({ where: { id } });
    return true;
  },

  /** Seed default categories for a new org. Skips any that already exist. */
  async seedDefaults(orgId: string): Promise<void> {
    await prisma.expenseCategoryOption.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ orgId, ...c })),
      skipDuplicates: true,
    });
  },
};
