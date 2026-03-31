// Platform-wide service — used by /api/admin/* routes (SUPER_ADMIN only)
// Currently backed by Prisma. Falls back to mock data in dev/demo mode.

import type { PlatformStats, OrgSummary, OrgDetail } from "@/modules/admin/types";

// ── Mock fallback data ─────────────────────────────────────────────────────────

const MOCK_ORGS: OrgSummary[] = [
  {
    id: "test-org-001",
    name: "Test Organization",
    slug: "test-org",
    plan: "FREE",
    isActive: true,
    userCount: 4,
    storeCount: 1,
    productCount: 15,
    createdAt: new Date().toISOString(),
  },
];

const MOCK_STATS: PlatformStats = {
  totalOrgs: 1,
  activeOrgs: 1,
  totalUsers: 5,
  totalStores: 1,
  newOrgsThisMonth: 1,
  planDistribution: [{ plan: "FREE", count: 1 }],
};

// ── Service ────────────────────────────────────────────────────────────────────

export const platformService = {
  async getStats(): Promise<PlatformStats> {
    if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
      return MOCK_STATS;
    }

    const { prisma } = await import("@/lib/db");

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
    if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
      return MOCK_ORGS;
    }

    const { prisma } = await import("@/lib/db");

    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, stores: true, products: true },
        },
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
    if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
      const org = MOCK_ORGS.find((o) => o.id === orgId);
      if (!org) return null;
      return {
        ...org,
        users: [
          { id: "test-owner-001",  name: "Test Owner", email: "owner@stockiva.com",  role: "OWNER", isActive: true, createdAt: new Date().toISOString() },
          { id: "test-admin-001",  name: "Test Admin", email: "admin@stockiva.com",  role: "ADMIN", isActive: true, createdAt: new Date().toISOString() },
          { id: "test-staff-001",  name: "Test Staff", email: "staff@stockiva.com",  role: "STAFF", isActive: true, createdAt: new Date().toISOString() },
        ],
        stores: [
          { id: "test-store-001", name: "Main Store", code: "MAIN", isActive: true },
        ],
      };
    }

    const { prisma } = await import("@/lib/db");

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
