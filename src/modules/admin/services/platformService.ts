// Platform-wide service — used by /api/admin/* routes (SUPER_ADMIN only)
// Currently backed by Prisma. Falls back to mock data in dev/demo mode.

import type { PlatformStats, OrgSummary, OrgDetail } from "@/modules/admin/types";

// ── Mock fallback data ─────────────────────────────────────────────────────────

const MOCK_ORGS: OrgSummary[] = [
  {
    id: "test-org-001",
    name: "Rare Thread",
    slug: "rare-thread",
    plan: "GROWTH",
    isActive: true,
    userCount: 4,
    storeCount: 1,
    productCount: 15,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "test-org-002",
    name: "Scent & Soul",
    slug: "scent-and-soul",
    plan: "STARTER",
    isActive: true,
    userCount: 4,
    storeCount: 1,
    productCount: 6,
    createdAt: "2025-02-15T00:00:00.000Z",
  },
];

const MOCK_ORG_DETAILS: Record<string, Omit<OrgDetail, keyof OrgSummary>> = {
  "test-org-001": {
    users: [
      { 
        id: "test-a-owner-001",
        name: "Minhaj Ahmad Khan",
        email: "owner@rarethread.com",
        role: "OWNER",
        isActive: true, 
        createdAt: "2025-01-01T00:00:00.000Z" 
      },
      { 
        id: "test-a-admin-001",
        name: "Urooj Ahmad",
        email: "admin@rarethread.com",
        role: "ADMIN",
        isActive: true, 
        createdAt: "2025-01-01T00:00:00.000Z" 
      },
      { 
        id: "test-a-manager-001",
        name: "Osama",
        email: "manager@rarethread.com",
        role: "MANAGER",
        isActive: true, 
        createdAt: "2025-01-01T00:00:00.000Z" 
      },
      { 
        id: "test-a-staff-001",
        name: "Irfan Khan",
        email: "staff@rarethread.com",
        role: "STAFF",
        isActive: true, 
        createdAt: "2025-01-01T00:00:00.000Z" 
      },
    ],
    stores: [
      { 
        id: "test-store-001", 
        name: "Rare Thread — Main Store", 
        code: "RT-MAIN", 
        isActive: true 
      }
    ],
  },
  "test-org-002": {
    users: [
      { 
        id: "test-b-owner-001",
        name: "Urooj Ahmad",
        email: "owner@scentandsoul.com",
        role: "OWNER",
        isActive: true,
        createdAt: "2025-02-15T00:00:00.000Z"
      },
      { 
        id: "test-b-admin-001",
        name: "Shad Mirza",
        email: "admin@scentandsoul.com",
        role: "ADMIN",
        isActive: true,
        createdAt: "2025-02-15T00:00:00.000Z"
      },
      { 
        id: "test-b-manager-001",
        name: "Meera Joshi",
        email: "manager@scentandsoul.com",
        role: "MANAGER",
        isActive: true,
        createdAt: "2025-02-15T00:00:00.000Z"
      },
      { 
        id: "test-b-staff-001",
        name: "Rohit Sharma",
        email: "staff@scentandsoul.com",
        role: "STAFF",
        isActive: true,
        createdAt: "2025-02-15T00:00:00.000Z"
      },
    ],
    stores: [
      { 
        id: "test-store-002", 
        name: "Scent & Soul — Flagship", 
        code: "SS-MAIN", 
        isActive: true 
      }
    ],
  },
};

const MOCK_STATS: PlatformStats = {
  totalOrgs: 2,
  activeOrgs: 2,
  totalUsers: 8,
  totalStores: 2,
  newOrgsThisMonth: 0,
  planDistribution: [
    { plan: "GROWTH",  count: 1 },
    { plan: "STARTER", count: 1 },
  ],
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
      const details = MOCK_ORG_DETAILS[orgId];
      if (!details) return null;
      return { ...org, ...details };
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
