// Platform-wide service — used by /api/admin/* routes (SUPER_ADMIN only)

import { prisma } from "@/lib/db";
import type { PlatformStats, OrgSummary, OrgDetail } from "@/modules/admin/types";

export const platformService = {
  async getStats(): Promise<PlatformStats> {
    const [totalOrgs, activeOrgs, totalUsers, totalStores] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.user.count({ where: { orgId: { not: null } } }),
      prisma.store.count(),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newOrgsThisMonth = await prisma.organization.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const planGroups = await prisma.organization.groupBy({
      by: ["plan"],
      _count: { id: true },
    });

    return {
      totalOrgs,
      activeOrgs,
      totalUsers,
      totalStores,
      newOrgsThisMonth,
      planDistribution: planGroups.map((g) => ({ plan: g.plan, count: g._count.id })),
    };
  },

  async listOrgs(): Promise<OrgSummary[]> {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, stores: true, products: true } },
      },
    });

    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      isActive: o.isActive,
      userCount: o._count.users,
      storeCount: o._count.stores,
      productCount: o._count.products,
      createdAt: o.createdAt.toISOString(),
    }));
  },

  async getOrgDetail(orgId: string): Promise<OrgDetail | null> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, stores: true, products: true } },
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        stores: {
          select: { id: true, name: true, code: true, isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      isActive: org.isActive,
      userCount: org._count.users,
      storeCount: org._count.stores,
      productCount: org._count.products,
      createdAt: org.createdAt.toISOString(),
      users: org.users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      stores: org.stores,
    };
  },
};
