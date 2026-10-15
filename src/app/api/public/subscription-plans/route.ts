import { listPublishedSubscriptionPlans } from "@/modules/subscriptions/catalogService";

export async function GET() {
  try {
    return Response.json({ plans: await listPublishedSubscriptionPlans() }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("[public subscription plans] read failed", error);
    return Response.json({ error: "Subscription plans are temporarily unavailable" }, { status: 503 });
  }
}
