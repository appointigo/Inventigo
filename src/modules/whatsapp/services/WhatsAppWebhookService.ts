import { createHash } from "node:crypto";
import type {
  Prisma,
  PrismaClient,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from "@prisma/client";
import { normalizeWhatsAppPhone } from "./WhatsAppContactService.ts";
import {
  parseMetaInboundMessages,
  parseMetaStatuses,
  type ParsedMetaInboundMessage,
} from "../webhooks/metaWebhook.ts";

const rank: Record<WhatsAppMessageStatus, number> = {
  QUEUED: 0,
  SUBMITTED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};
const mapped = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" } as const;
const inboundTypes: Record<string, WhatsAppMessageType> = {
  text: "TEXT",
  image: "IMAGE",
  document: "DOCUMENT",
  video: "VIDEO",
  interactive: "INTERACTIVE",
  button: "INTERACTIVE",
};

export class WhatsAppWebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async receive(payload: Prisma.InputJsonValue) {
    const statuses = parseMetaStatuses(payload),
      inbound = parseMetaInboundMessages(payload);
    for (const item of statuses)
      await this.handle(
        `${item.wabaId}:${item.phoneNumberId ?? ""}:${item.status.id}:${item.status.status}:${item.status.timestamp}`,
        item.status.id,
        `message.${item.status.status}`,
        payload,
        (id) => this.processStatus(id, item, payload)
      );
    for (const item of inbound)
      await this.handle(
        `${item.wabaId}:${item.phoneNumberId}:${item.message.id}:inbound`,
        item.message.id,
        "message.inbound",
        payload,
        (id) => this.processInbound(id, item)
      );
    return { accepted: true, statusEvents: statuses.length, inboundMessages: inbound.length };
  }

  private async handle(
    key: string,
    providerEventId: string,
    eventType: string,
    payload: Prisma.InputJsonValue,
    process: (id: string) => Promise<void>
  ) {
    const dedupeKey = createHash("sha256").update(key).digest("hex");
    const event = await this.prisma.whatsAppWebhookEvent.upsert({
      where: { dedupeKey },
      update: {},
      create: { providerEventId, dedupeKey, eventType, payload },
    });
    if (event.processingStatus === "PROCESSED") return;
    const claimed = await this.prisma.whatsAppWebhookEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          { processingStatus: { in: ["RECEIVED", "FAILED"] } },
          { processingStatus: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 300_000) } },
        ],
      },
      data: {
        processingStatus: "PROCESSING",
        processingAttempts: { increment: 1 },
        lastError: null,
      },
    });
    if (!claimed.count) return;
    try {
      await process(event.id);
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

  private async processStatus(
    webhookEventId: string,
    item: ReturnType<typeof parseMetaStatuses>[number],
    payload: Prisma.InputJsonValue
  ) {
    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { metaMessageId: item.status.id },
      select: {
        id: true,
        organizationId: true,
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
    const next = mapped[item.status.status],
      latest = [message.sentAt, message.deliveredAt, message.readAt, message.failedAt]
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
    const shouldUpdate =
      (!latest || occurredAt >= latest) &&
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
        data: {
          organizationId: message.organizationId,
          processingStatus: "PROCESSED",
          processedAt: new Date(),
          lastError: null,
        },
      }),
    ]);
  }

  private async processInbound(webhookEventId: string, item: ParsedMetaInboundMessage) {
    const receiving = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: { metaPhoneNumberId: item.phoneNumberId, waba: { metaWabaId: item.wabaId } },
      select: {
        id: true,
        displayPhoneNumber: true,
        waba: { select: { integration: { select: { organizationId: true } } } },
        storeMappings: {
          where: { isActive: true },
          select: { storeId: true, store: { select: { orgId: true } } },
        },
      },
    });
    if (!receiving) throw new Error("Unknown receiving WhatsApp phone number");
    const organizationId = receiving.waba.integration.organizationId;
    const validStores = new Set(
      receiving.storeMappings.filter((m) => m.store.orgId === organizationId).map((m) => m.storeId)
    );
    const externalPhone = normalizeWhatsAppPhone(item.message.from);
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { organizationId_normalizedPhone: { organizationId, normalizedPhone: externalPhone } },
      select: { id: true, stores: { select: { storeId: true } } },
    });
    const contactStores = new Set(contact?.stores.map((s) => s.storeId) ?? []),
      candidates = [...validStores].filter((id) => contactStores.has(id));
    let storeId: string | null = null,
      referenceType: string | null = null,
      referenceId: string | null = null;
    if (item.message.context?.id) {
      const context = await this.prisma.whatsAppMessage.findFirst({
        where: {
          metaMessageId: item.message.context.id,
          organizationId,
          phoneNumberId: receiving.id,
          direction: "OUTBOUND",
        },
        select: { storeId: true, referenceType: true, referenceId: true },
      });
      if (context?.storeId && validStores.has(context.storeId)) {
        storeId = context.storeId;
        referenceType = context.referenceType;
        referenceId = context.referenceId;
      }
    }
    if (!storeId) {
      const recent = await this.prisma.whatsAppMessage.findFirst({
        where: {
          organizationId,
          phoneNumberId: receiving.id,
          direction: "OUTBOUND",
          toPhone: externalPhone,
          storeId: { not: null },
          createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
        orderBy: { createdAt: "desc" },
        select: { storeId: true, referenceType: true, referenceId: true },
      });
      if (recent?.storeId && validStores.has(recent.storeId)) {
        storeId = recent.storeId;
        referenceType = recent.referenceType;
        referenceId = recent.referenceId;
      }
    }
    if (!storeId && candidates.length === 1) storeId = candidates[0]!;
    const unresolvedReason = storeId
      ? null
      : !contact
        ? "CONTACT_NOT_FOUND_NO_CONTEXT"
        : candidates.length > 1
          ? "MULTIPLE_STORE_CANDIDATES"
          : "NO_RELIABLE_STORE_CONTEXT";
    const occurredAt = new Date(Number(item.message.timestamp) * 1000);
    if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid Meta inbound timestamp");
    const existing = await this.prisma.whatsAppConversation.findFirst({
      where: {
        organizationId,
        phoneNumberId: receiving.id,
        externalPhone,
        contactId: contact?.id ?? null,
        storeId,
        routingStatus: storeId ? "RESOLVED" : "UNRESOLVED",
        status: "OPEN",
      },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });
    const conversation = existing
      ? await this.prisma.whatsAppConversation.update({
          where: { id: existing.id },
          data: { lastMessageAt: occurredAt, unresolvedReason },
        })
      : await this.prisma.whatsAppConversation.create({
          data: {
            organizationId,
            phoneNumberId: receiving.id,
            contactId: contact?.id,
            storeId,
            externalPhone,
            routingStatus: storeId ? "RESOLVED" : "UNRESOLVED",
            unresolvedReason,
            lastMessageAt: occurredAt,
          },
        });
    const contentKey = [
      "text",
      "image",
      "document",
      "video",
      "interactive",
      "button",
      "audio",
      "sticker",
      "location",
    ].find((k) => item.message[k] !== undefined);
    const safePayload = {
      type: item.message.type,
      profileName: item.profileName,
      content: contentKey ? item.message[contentKey] : undefined,
    } as Prisma.InputJsonValue;
    const message = await this.prisma.whatsAppMessage.upsert({
      where: { metaMessageId: item.message.id },
      update: { conversationId: conversation.id },
      create: {
        organizationId,
        storeId,
        phoneNumberId: receiving.id,
        conversationId: conversation.id,
        metaMessageId: item.message.id,
        direction: "INBOUND",
        type: inboundTypes[item.message.type] ?? "TEXT",
        purpose: "SUPPORT",
        fromPhone: externalPhone,
        toPhone: item.displayPhoneNumber ?? receiving.displayPhoneNumber,
        referenceType,
        referenceId,
        payload: safePayload,
        status: "SENT",
        sentAt: occurredAt,
        createdAt: occurredAt,
      },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.whatsAppMessageEvent.create({
        data: {
          messageId: message.id,
          eventType: "INBOUND_RECEIVED",
          metaStatus: "received",
          occurredAt,
          payload: safePayload,
        },
      }),
      this.prisma.whatsAppWebhookEvent.update({
        where: { id: webhookEventId },
        data: {
          organizationId,
          processingStatus: "PROCESSED",
          processedAt: new Date(),
          lastError: null,
        },
      }),
    ]);
  }
}
