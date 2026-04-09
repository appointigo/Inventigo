// Analytics service — used by /api/admin/analytics routes (SUPER_ADMIN only)

import { prisma } from "@/lib/db";
import type { AnalyticsData } from "@/modules/admin/types";

export const analyticsService = {
  async getData(): Promise<AnalyticsData> {
    const now = new Date();

    // Monthly signups (this month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySignups = await prisma.organization.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Estimated MRR (based on plan)
    const planPrices: Record<string, number> = { FREE: 0, PRO: 29, ENTERPRISE: 99 };
    const planGroups = await prisma.organization.groupBy({
      by: ["plan"],
      _count: { id: true },
      where: { isActive: true },
    });
    const estimatedMRR = planGroups.reduce((sum, g) => sum + (planPrices[g.plan] || 0) * g._count.id, 0);

    // 30-day retention
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const orgsCreatedBefore30 = await prisma.organization.count({
      where: { createdAt: { lte: thirtyDaysAgo } },
    });
    const activeOrgsCreatedBefore30 = await prisma.organization.count({
      where: { createdAt: { lte: thirtyDaysAgo }, isActive: true },
    });
    const retention30Day = orgsCreatedBefore30 > 0
      ? Math.round((activeOrgsCreatedBefore30 / orgsCreatedBefore30) * 100)
      : 100;

    // Platform sales total
    const salesAgg = await prisma.sale.aggregate({ _sum: { total: true } });
    const platformSales = Number(salesAgg._sum.total || 0);

    // Signups over time (last 8 weeks)
    const signupsOverTime: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const count = await prisma.organization.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      signupsOverTime.push({ week: `W${8 - i}`, count });
    }

    // Retention (30/60/90 day)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    const orgs60 = await prisma.organization.count({ where: { createdAt: { lte: sixtyDaysAgo } } });
    const active60 = await prisma.organization.count({ where: { createdAt: { lte: sixtyDaysAgo }, isActive: true } });
    const orgs90 = await prisma.organization.count({ where: { createdAt: { lte: ninetyDaysAgo } } });
    const active90 = await prisma.organization.count({ where: { createdAt: { lte: ninetyDaysAgo }, isActive: true } });

    const retention = [
      { period: "30-Day", percentage: retention30Day },
      { period: "60-Day", percentage: orgs60 > 0 ? Math.round((active60 / orgs60) * 100) : 100 },
      { period: "90-Day", percentage: orgs90 > 0 ? Math.round((active90 / orgs90) * 100) : 0 },
    ];

    // Top orgs by revenue
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: {
        stores: {
          include: {
            sales: { select: { total: true } },
          },
        },
      },
    });
    const topOrgsByRevenue = orgs
      .map((o) => ({
        name: o.name,
        revenue: o.stores.reduce(
          (sum, s) => sum + s.sales.reduce((ss, sale) => ss + Number(sale.total), 0),
          0
        ),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Plan distribution
    const planDistribution = planGroups.map((g) => ({
      plan: g.plan,
      count: g._count.id,
    }));

    // Revenue by payment method
    const paymentGroups = await prisma.sale.groupBy({
      by: ["paymentMethod"],
      _sum: { total: true },
      where: { status: "COMPLETED" },
    });
    const revenueByPaymentMethod = paymentGroups.map((g) => ({
      method: g.paymentMethod,
      total: Number(g._sum.total || 0),
    }));

    return {
      monthlySignups,
      estimatedMRR,
      retention30Day,
      platformSales,
      signupsOverTime,
      retention,
      topOrgsByRevenue,
      planDistribution,
      revenueByPaymentMethod,
    };
  },
};
