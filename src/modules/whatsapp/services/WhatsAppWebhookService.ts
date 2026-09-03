import { createHash } from "node:crypto";
import type { Prisma, PrismaClient, WhatsAppMessageStatus } from "@prisma/client";
import { parseMetaStatuses } from "../webhooks/metaWebhook.ts";

const rank: Record<WhatsAppMessageStatus, number> = {
  QUEUED: 0,
  SUBMITTED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};
const mapped = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" } as const;

export class WhatsAppWebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async receive(payload: Prisma.InputJsonValue) {
    const statuses = parseMetaStatuses(payload);
    for (const item of statuses) {
      const dedupeKey = createHash("sha256")
        .update(
          `${item.wabaId}:${item.phoneNumberId ?? ""}:${item.status.id}:${item.status.status}:${item.status.timestamp}`
        )
        .digest("hex");
      const event = await this.prisma.whatsAppWebhookEvent.upsert({
        where: { dedupeKey },
        update: {},
        create: {
          providerEventId: item.status.id,
          dedupeKey,
          eventType: `message.${item.status.status}`,
          payload,
        },
      });
      if (event.processingStatus === "PROCESSED") continue;
      const staleBefore = new Date(Date.now() - 5 * 60_000);
      const claimed = await this.prisma.whatsAppWebhookEvent.updateMany({
        where: {
          id: event.id,
          OR: [
            { processingStatus: { in: ["RECEIVED", "FAILED"] } },
            { processingStatus: "PROCESSING", updatedAt: { lt: staleBefore } },
          ],
        },
        data: {
          processingStatus: "PROCESSING",
          processingAttempts: { increment: 1 },
          lastError: null,
        },
      });
      if (!claimed.count) continue;
      try {
        await this.process(event.id, item, payload);
      } catch (error) {
        await this.prisma.whatsAppWebhookEvent.update({
          where: { id: event.id },
          data: {
            processingStatus: "FAILED",
            lastError:
              error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed",
          },
        });
        throw error;
      }
    }
    return { accepted: true, statusEvents: statuses.length };
  }

  private async process(
    webhookEventId: string,
    item: ReturnType<typeof parseMetaStatuses>[number],
    payload: Prisma.InputJsonValue
  ) {
    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { metaMessageId: item.status.id },
      select: {
        id: true,
        campaignRecipientId: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
      },
    });
    if (!message) {
      await this.prisma.whatsAppWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          processingStatus: "PROCESSED",
          processedAt: new Date(),
          lastError: "Unknown Meta message id",
        },
      });
      return;
    }
    const occurredAt = new Date(Number(item.status.timestamp) * 1000);
    if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid Meta status timestamp");
    const next = mapped[item.status.status];
    const latestKnown = [message.sentAt, message.deliveredAt, message.readAt, message.failedAt]
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const shouldUpdate =
      (!latestKnown || occurredAt >= latestKnown) &&
      (next === "FAILED" || rank[next] >= rank[message.status]);
    const error = item.status.errors?.[0];
    await this.prisma.$transaction([
      this.prisma.whatsAppMessageEvent.create({
        data: {
          messageId: message.id,
          eventType: `STATUS_${next}`,
          metaStatus: item.status.status,
          payload,
          occurredAt,
        },
      }),
      ...(shouldUpdate
        ? [
            this.prisma.whatsAppMessage.update({
              where: { id: message.id },
              data: {
                status: next,
                ...(next === "SENT" ? { sentAt: occurredAt } : {}),
                ...(next === "DELIVERED" ? { deliveredAt: occurredAt } : {}),
                ...(next === "READ" ? { readAt: occurredAt } : {}),
                ...(next === "FAILED"
                  ? {
                      failedAt: occurredAt,
                      errorCode: error?.code ? String(error.code) : "META_DELIVERY_FAILED",
                      errorMessage:
                        error?.error_data?.details ??
                        error?.message ??
                        error?.title ??
                        "Meta reported delivery failure",
                    }
                  : {}),
              },
            }),
            ...(message.campaignRecipientId
              ? [
                  this.prisma.whatsAppCampaignRecipient.update({
                    where: { id: message.campaignRecipientId },
                    data: { status: next },
                  }),
                ]
              : []),
          ]
        : []),
      this.prisma.whatsAppWebhookEvent.update({
        where: { id: webhookEventId },
        data: { processingStatus: "PROCESSED", processedAt: new Date(), lastError: null },
      }),
    ]);
  }
}
