import { prisma } from "@/lib/db";
import type { AnnouncementItem } from "@/modules/admin/types";

export const announcementsService = {
  async listEntries(): Promise<AnnouncementItem[]> {
    const rows = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Batch-fetch creator names
    const creatorIds = [...new Set(rows.map((r) => r.createdBy))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(creators.map((u) => [u.id, u.name]));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      severity: r.severity,
      targetPlan: r.targetPlan,
      activeFrom: r.activeFrom.toISOString(),
      activeUntil: r.activeUntil?.toISOString() ?? null,
      isActive: r.isActive,
      createdBy: r.createdBy,
      creatorName: nameMap.get(r.createdBy) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async createEntry(data: {
    title: string;
    body: string;
    severity: string;
    targetPlan?: string;
    activeFrom?: string;
    activeUntil?: string;
    createdBy: string;
  }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        severity: data.severity,
        targetPlan: data.targetPlan ?? null,
        activeFrom: data.activeFrom ? new Date(data.activeFrom) : new Date(),
        activeUntil: data.activeUntil ? new Date(data.activeUntil) : null,
        createdBy: data.createdBy,
      },
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    return prisma.announcement.update({
      where: { id },
      data: { isActive },
    });
  },
};
