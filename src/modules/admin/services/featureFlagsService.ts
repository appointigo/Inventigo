// Feature Flags service — used by /api/admin/feature-flags routes (SUPER_ADMIN only)

import { prisma } from "@/lib/db";
import type { FeatureFlagItem } from "@/modules/admin/types";

export const featureFlagsService = {
  async listFlags(): Promise<FeatureFlagItem[]> {
    const flags = await prisma.featureFlag.findMany({
      where: { orgId: null }, // global flags only in admin view
      orderBy: { createdAt: "desc" },
    });

    // Count affected orgs per flag
    const totalOrgs = await prisma.organization.count({ where: { isActive: true } });

    return flags.map((f) => ({
      id: f.id,
      key: f.key,
      value: f.value,
      scope: f.scope,
      description: f.description,
      orgId: f.orgId,
      orgName: null,
      updatedAt: f.updatedAt.toISOString(),
      affectedOrgs: f.value ? totalOrgs : 0,
    }));
  },

  async toggleFlag(flagId: string, value: boolean) {
    return prisma.featureFlag.update({
      where: { id: flagId },
      data: { value },
    });
  },

  async createFlag(data: {
    key: string;
    value: boolean;
    scope: string;
    description: string;
    orgId?: string;
  }) {
    return prisma.featureFlag.create({
      data: {
        key: data.key,
        value: data.value,
        scope: data.scope,
        description: data.description,
        orgId: data.orgId ?? null,
      },
    });
  },
};
