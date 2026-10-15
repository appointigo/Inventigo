import "server-only";
import { prisma } from "@/lib/db";
import { featureMapFromRows } from "./featureValues";

/** Only published, effective versions enter the public catalog. */
export async function listPublishedSubscriptionPlans(now = new Date()) {
  const versions = await prisma.saasPlanVersion.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: now } },
    orderBy: [{ planKey: "asc" }, { version: "desc" }],
    include: {
      prices: { orderBy: { interval: "asc" } },
      features: { include: { feature: true } },
    },
  });

  const latest = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    if (!latest.has(version.planKey)) latest.set(version.planKey, version);
  }
  return [...latest.values()].map((version) => ({
    key: version.planKey,
    versionId: version.id,
    version: version.version,
    name: version.displayName,
    description: version.description,
    features: featureMapFromRows(version.features),
    prices: version.prices.map((price) => ({
      id: price.id,
      interval: price.interval,
      currency: price.currency,
      amountMinor: price.amountMinor,
      taxMode: price.taxMode,
    })),
  }));
}
