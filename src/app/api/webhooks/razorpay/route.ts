import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyRazorpayWebhook } from "@/modules/subscriptions/providers/razorpay";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 1_048_576;

export async function POST(request: Request) {
  if (process.env.SUBSCRIPTION_WEBHOOK_INTAKE_ENABLED !== "true") {
    return Response.json({ error: "Webhook unavailable" }, { status: 503 });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return Response.json({ error: "Webhook unavailable" }, { status: 503 });
  }
  if (!verifyRazorpayWebhook(rawBody, request.headers.get("x-razorpay-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId || eventId.length > 128) {
    return Response.json({ error: "Invalid event ID" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      typeof (payload as Record<string, unknown>).event !== "string") {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
  const eventType = (payload as Record<string, unknown>).event as string;
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");

  try {
    await prisma.saasWebhookEvent.create({ data: {
      provider: "RAZORPAY",
      eventId,
      eventType,
      payload: payload as Prisma.InputJsonValue,
      payloadHash,
    } });
    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.saasWebhookEvent.findUnique({
        where: { provider_eventId: { provider: "RAZORPAY", eventId } },
        select: { payloadHash: true },
      });
      if (existing?.payloadHash === payloadHash) return Response.json({ received: true }, { status: 200 });
      return Response.json({ error: "Event ID conflict" }, { status: 409 });
    }
    console.error("[razorpay webhook] durable receipt failed", error);
    return Response.json({ error: "Webhook temporarily unavailable" }, { status: 503 });
  }
}
