import { prisma } from "@/lib/db";
import type { WeeklyOffConfig, WeeklyOffDayConfig } from "../types";

export const weeklyOffService = {
  async list(orgId: string, storeId?: string): Promise<WeeklyOffConfig[]> {
    const stores = await prisma.store.findMany({
      where: {
        orgId,
        isActive: true,
        ...(storeId ? { id: storeId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const weeklyOffRows = await prisma.weeklyOff.findMany({
      where: {
        orgId,
        ...(storeId ? { storeId } : {}),
      },
      select: {
        storeId: true,
        dayOfWeek: true,
        isOptional: true,
      },
      orderBy: [{ storeId: "asc" }, { dayOfWeek: "asc" }],
    });

    const weeklyOffByStore = new Map<string, Array<{ dayOfWeek: number; isOptional: boolean }>>();
    for (const row of weeklyOffRows) {
      const existing = weeklyOffByStore.get(row.storeId) ?? [];
      existing.push({ dayOfWeek: row.dayOfWeek, isOptional: row.isOptional });
      weeklyOffByStore.set(row.storeId, existing);
    }

    return stores.map((store) => ({
      storeId: store.id,
      storeName: store.name,
      days: (weeklyOffByStore.get(store.id) ?? []).map((row) => ({
        dayOfWeek: row.dayOfWeek,
        isOptional: row.isOptional,
      })),
    }));
  },

  async set(orgId: string, storeId: string, days: WeeklyOffDayConfig[]): Promise<WeeklyOffConfig> {
    const store = await prisma.store.findFirst({
      where: { id: storeId, orgId, isActive: true },
      select: { id: true, name: true },
    });
    if (!store) {
      throw new Error("Store not found");
    }

    const uniqueDays = Array.from(new Map(days.map((day) => [day.dayOfWeek, day])).values())
      .filter((day) => day.dayOfWeek >= 0 && day.dayOfWeek <= 6)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    await prisma.$transaction([
      prisma.weeklyOff.deleteMany({ where: { orgId, storeId } }),
      ...(uniqueDays.length > 0
        ? [
            prisma.weeklyOff.createMany({
              data: uniqueDays.map((day) => ({
                orgId,
                storeId,
                dayOfWeek: day.dayOfWeek,
                isOptional: day.isOptional,
              })),
            }),
          ]
        : []),
    ]);

    return {
      storeId: store.id,
      storeName: store.name,
      days: uniqueDays,
    };
  },

  async getWeeklyOffSet(orgId: string, storeId: string): Promise<Set<number>> {
    const rows = await prisma.weeklyOff.findMany({
      where: { orgId, storeId },
      select: { dayOfWeek: true },
    });
    return new Set(rows.map((row) => row.dayOfWeek));
  },
};