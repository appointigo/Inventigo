import "server-only";
import { prisma } from "@/lib/db";
import { resolveCommercialAccess } from "./accessPolicy";
import { featureMapFromRows } from "./featureValues";

/** The database, not a JWT or client catalog, owns effective commercial access. */
export async function getEffectiveCommercialAccess(organizationId: string, now = new Date()) {
  const [subscription, grants] = await Promise.all([
    prisma.saasSubscription.findFirst({
      where: { organizationId, isCurrent: true, planVersion: { status: "PUBLISHED" } },
      include: { planVersion: { include: { features: { include: { feature: true } } } } },
    }),
    prisma.saasAccessGrant.findMany({
      where: { organizationId, status: "APPROVED", startsAt: { lte: now }, endsAt: { gt: now }, planVersion: { status: "PUBLISHED" } },
      include: { planVersion: { include: { features: { include: { feature: true } } } } },
    }),
  ]);

  return resolveCommercialAccess({
    now,
    subscription: subscription && {
      planVersionId: subscription.planVersionId,
      billingStatus: subscription.billingStatus,
      isCurrent: subscription.isCurrent,
      validUntil: subscription.paidThrough ?? new Date(0),
      features: featureMapFromRows(subscription.planVersion.features),
    },
    grants: grants.map((grant) => ({
      planVersionId: grant.planVersionId,
      status: grant.status,
      startsAt: grant.startsAt,
      validUntil: grant.endsAt,
      features: featureMapFromRows(grant.planVersion.features),
    })),
  });
}
