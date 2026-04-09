// Platform Users service — used by /api/admin/users routes (SUPER_ADMIN only)

import { prisma } from "@/lib/db";
import type { PlatformUser, PlatformUserStats } from "@/modules/admin/types";

export const platformUsersService = {
  async getStats(): Promise<PlatformUserStats> {
    const [totalUsers, activeUsers, adminUsers, totalOrgs] = await Promise.all([
      prisma.user.count({ where: { orgId: { not: null } } }),
      prisma.user.count({ where: { orgId: { not: null }, isActive: true } }),
      prisma.user.count({ where: { orgId: { not: null }, role: { in: ["OWNER", "ADMIN"] } } }),
      prisma.organization.count(),
    ]);

    return { totalUsers, activeUsers, adminUsers, totalOrgs };
  },

  async listUsers(): Promise<PlatformUser[]> {
    const users = await prisma.user.findMany({
      where: { role: { not: "SUPER_ADMIN" } },
      orderBy: { createdAt: "desc" },
      include: { org: { select: { name: true, slug: true } } },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      orgId: u.orgId,
      orgName: u.org?.name ?? null,
      orgSlug: u.org?.slug ?? null,
    }));
  },

  async toggleUserActive(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  },
};
