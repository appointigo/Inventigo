// Audit Log service — used by /api/admin/audit-log routes (SUPER_ADMIN only)

import { prisma } from "@/lib/db";
import type { AuditLogEntry } from "@/modules/admin/types";

export const auditLogService = {
  async listEntries(limit = 50): Promise<AuditLogEntry[]> {
    const entries = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch performer names in batch
    const performerIds = [...new Set(entries.map((e) => e.performedBy))];
    const performers = await prisma.user.findMany({
      where: { id: { in: performerIds } },
      select: { id: true, name: true },
    });
    const performerMap = new Map(performers.map((p) => [p.id, p.name]));

    return entries.map((e) => ({
      id: e.id,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      targetName: e.targetName,
      performedBy: e.performedBy,
      performerName: performerMap.get(e.performedBy) ?? null,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt.toISOString(),
    }));
  },

  async createEntry(data: {
    action: string;
    targetType: string;
    targetId: string;
    targetName?: string;
    performedBy: string;
    metadata?: Record<string, string | number | boolean>;
  }) {
    return prisma.adminAuditLog.create({
      data: {
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName ?? null,
        performedBy: data.performedBy,
        metadata: data.metadata as Record<string, string | number | boolean> | undefined,
      },
    });
  },
};
