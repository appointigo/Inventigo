import "server-only";
import { prisma } from "@/lib/db";

export type CheckoutSelection = { planKey: string; interval: "MONTH" | "YEAR" };

export function parseCheckoutSelection(input: unknown): CheckoutSelection | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (!["starter", "growth", "business"].includes(String(value.planKey))) return null;
  if (value.interval !== "MONTH" && value.interval !== "YEAR") return null;
  return { planKey: String(value.planKey), interval: value.interval };
}

export async function resolveCheckoutPrice(selection: CheckoutSelection) {
  const version = await prisma.saasPlanVersion.findFirst({
    where: {
      planKey: selection.planKey,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    orderBy: { version: "desc" },
    include: { prices: { where: { interval: selection.interval, currency: "INR" } } },
  });
  const price = version?.prices[0];
  return version && price ? { version, price } : null;
}

export function testCheckoutEnabled() {
  return process.env.SUBSCRIPTION_TEST_CHECKOUT_ENABLED === "true" &&
    process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") === true &&
    Boolean(process.env.RAZORPAY_KEY_SECRET);
}
