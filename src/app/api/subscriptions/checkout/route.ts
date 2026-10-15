import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createRazorpaySubscription } from "@/modules/subscriptions/providers/razorpay";
import { parseCheckoutSelection, resolveCheckoutPrice, testCheckoutEnabled } from "@/modules/subscriptions/checkoutService";

export const runtime = "nodejs";

async function owner() {
  const sessionUser = await requireOrgAuth();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { orgId: true, role: true, emailVerified: true },
  });
  return user?.emailVerified && user.role === "OWNER" && user.orgId === sessionUser.orgId
    ? { orgId: user.orgId }
    : null;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await owner();
    if (!actor) return Response.json({ error: "Only a verified workspace owner can start checkout" }, { status: 403 });
    const selection = parseCheckoutSelection({
      planKey: request.nextUrl.searchParams.get("plan"),
      interval: request.nextUrl.searchParams.get("interval"),
    });
    if (!selection) return Response.json({ error: "Invalid plan selection" }, { status: 400 });
    const offer = await resolveCheckoutPrice(selection);
    const existing = await prisma.saasSubscription.findFirst({
      where: { organizationId: actor.orgId, isCurrent: true },
      select: { billingStatus: true, planPriceId: true, providerSubscriptionId: true },
    });
    const canResume = existing?.billingStatus === "PENDING" &&
      existing.planPriceId === offer?.price.id && Boolean(existing.providerSubscriptionId);
    const ready = Boolean(offer?.price.providerPlanId && testCheckoutEnabled() && (!existing || canResume));
    return Response.json({
      ready,
      reason: !offer || !offer.price.providerPlanId ? "Payment setup is incomplete for this plan." :
        !testCheckoutEnabled() ? "Payments are temporarily unavailable." :
        existing && !canResume ? "A subscription or checkout already exists for this workspace." : null,
      price: offer ? {
        amountMinor: offer.price.amountMinor,
        currency: offer.price.currency,
        interval: offer.price.interval,
        taxMode: offer.price.taxMode,
      } : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && /Unauthorized|Forbidden/.test(error.message)) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[subscription checkout] availability failed", error);
    return Response.json({ error: "Checkout availability could not be loaded" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await owner();
    if (!actor) return Response.json({ error: "Only a verified workspace owner can start checkout" }, { status: 403 });
    const selection = parseCheckoutSelection(await request.json().catch(() => null));
    if (!selection) return Response.json({ error: "Invalid plan selection" }, { status: 400 });
    if (!testCheckoutEnabled()) return Response.json({ error: "Test Mode checkout is disabled" }, { status: 503 });
    const offer = await resolveCheckoutPrice(selection);
    if (!offer?.price.providerPlanId) {
      return Response.json({ error: "This plan is not available for checkout yet" }, { status: 409 });
    }
    const existing = await prisma.saasSubscription.findFirst({
      where: { organizationId: actor.orgId, isCurrent: true },
    });
    if (existing) {
      if (existing.billingStatus === "PENDING" && existing.planPriceId === offer.price.id && existing.providerSubscriptionId) {
        return Response.json({ keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: existing.providerSubscriptionId },
          { headers: { "Cache-Control": "private, no-store" } });
      }
      return Response.json({ error: "A subscription or checkout already exists for this workspace" }, { status: 409 });
    }

    // The unique current-subscription index serializes concurrent checkout starts.
    const pending = await prisma.saasSubscription.create({ data: {
      organizationId: actor.orgId,
      planVersionId: offer.version.id,
      planPriceId: offer.price.id,
      provider: "RAZORPAY",
      billingStatus: "PENDING",
      isCurrent: true,
    } });
    // A network ambiguity leaves the pending row for reconciliation, preventing
    // a second provider subscription from being created by a blind retry.
    const provider = await createRazorpaySubscription({
      providerPlanId: offer.price.providerPlanId,
      price: offer.price,
      totalCount: selection.interval === "MONTH" ? 12 : 5,
      correlationId: pending.id,
    });
    await prisma.saasSubscription.update({
      where: { id: pending.id },
      data: { providerSubscriptionId: provider.id },
    });
    return Response.json({ keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: provider.id },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && /Unauthorized|Forbidden/.test(error.message)) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "A checkout has already started for this workspace" }, { status: 409 });
    }
    console.error("[subscription checkout] start failed", error);
    return Response.json({ error: "Checkout could not be started. Please contact support before retrying." }, { status: 502 });
  }
}
