import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { SUBSCRIPTION_CATALOG, SUBSCRIPTION_FEATURES } from "../src/config/subscriptions/pricing.ts";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the SaaS catalog");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  for (const plan of SUBSCRIPTION_CATALOG.plans) {
    for (const amount of [plan.monthlyPaise, plan.annualPaise]) {
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`Invalid price for ${plan.key}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const definition of SUBSCRIPTION_FEATURES) {
      const existing = await tx.saasFeatureDefinition.findUnique({ where: { key: definition.key } });
      if (existing && existing.valueType !== definition.valueType) {
        throw new Error(`Changing the type of ${definition.key} requires a new feature key`);
      }
      await tx.saasFeatureDefinition.upsert({
        where: { key: definition.key },
        create: definition,
        update: { description: definition.description },
      });
    }

    for (const plan of SUBSCRIPTION_CATALOG.plans) {
      await tx.saasPlan.upsert({ where: { key: plan.key }, create: { key: plan.key }, update: {} });
      const identity = { planKey: plan.key, version: SUBSCRIPTION_CATALOG.version };
      const existing = await tx.saasPlanVersion.findUnique({ where: { planKey_version: identity } });
      if (existing?.status !== undefined && existing.status !== "DRAFT") {
        throw new Error(`${plan.key} version ${SUBSCRIPTION_CATALOG.version} is published/archived; increment SUBSCRIPTION_CATALOG.version`);
      }
      const version = await tx.saasPlanVersion.upsert({
        where: { planKey_version: identity },
        create: { ...identity, displayName: plan.name, description: plan.description },
        update: { displayName: plan.name, description: plan.description },
      });

      for (const [interval, amountMinor] of [
        ["MONTH", plan.monthlyPaise],
        ["YEAR", plan.annualPaise],
      ] as const) {
        await tx.saasPlanPrice.upsert({
          where: { planVersionId_interval_currency: {
            planVersionId: version.id,
            interval,
            currency: SUBSCRIPTION_CATALOG.currency,
          } },
          create: {
            planVersionId: version.id,
            interval,
            currency: SUBSCRIPTION_CATALOG.currency,
            amountMinor,
            taxMode: SUBSCRIPTION_CATALOG.taxMode,
          },
          update: { amountMinor, taxMode: SUBSCRIPTION_CATALOG.taxMode },
        });
      }

      for (const [featureKey, value] of Object.entries(plan.features)) {
        await tx.saasPlanFeature.upsert({
          where: { planVersionId_featureKey: { planVersionId: version.id, featureKey } },
          create: { planVersionId: version.id, featureKey, value },
          update: { value },
        });
      }
    }
  }, { maxWait: 15_000, timeout: 60_000 });
  console.log(`Seeded draft SaaS catalog version ${SUBSCRIPTION_CATALOG.version}. No version was published.`);
}

main().finally(() => prisma.$disconnect());
