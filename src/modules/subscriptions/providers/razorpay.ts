import "server-only";
import Razorpay from "razorpay";
import { assertRazorpayPlanMatches, type CatalogPrice } from "./razorpayPlan";
import { verifyRazorpaySignature } from "./razorpaySignature";

function credentials() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay credentials are not configured");
  return { key_id, key_secret };
}

function client() {
  return new Razorpay(credentials());
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  return verifyRazorpaySignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
}

export async function createRazorpaySubscription(input: {
  providerPlanId: string;
  price: CatalogPrice;
  totalCount: number;
  correlationId: string;
}) {
  if (!/^plan_[A-Za-z0-9]+$/.test(input.providerPlanId)) throw new Error("Invalid Razorpay plan ID");
  if (!Number.isSafeInteger(input.totalCount) || input.totalCount < 1 || input.totalCount > 120) {
    throw new Error("Invalid Razorpay billing cycle count");
  }
  const razorpay = client();
  const plan = await razorpay.plans.fetch(input.providerPlanId);
  assertRazorpayPlanMatches(input.price, plan);
  const subscription = await razorpay.subscriptions.create({
    plan_id: input.providerPlanId,
    total_count: input.totalCount,
    customer_notify: 1,
    notes: { stockiva_correlation_id: input.correlationId },
  });
  return { id: subscription.id, status: subscription.status, shortUrl: subscription.short_url };
}
