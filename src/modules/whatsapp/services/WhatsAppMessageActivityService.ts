import type { Prisma, PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type { messageActivityQuerySchema } from "../messageSchemas.ts";

const friendlyFailure = (code: string | null, message: string | null) => {
  if (!code) return null;
  if (code === "META_AUTH_FAILED" || code === "190") return "Meta authorization needs to be renewed.";
  if (code === "META_RATE_LIMITED") return "Meta temporarily limited message sending. Try again later.";
  if (code === "131026") return "The recipient could not receive this WhatsApp message.";
  return message || "WhatsApp could not deliver this message.";
};

export class WhatsAppMessageActivityService {
  constructor(private readonly prisma: PrismaClient) {}
  async list(organizationId: string, input: z.infer<typeof messageActivityQuerySchema>) {
    const where: Prisma.WhatsAppMessageWhereInput = { organizationId, ...(input.status ? { status: input.status } : {}), ...(input.purpose ? { purpose: input.purpose } : {}), ...(input.storeId ? { storeId: input.storeId, store: { orgId: organizationId } } : {}), ...(input.search ? { OR: [{ toPhone: { contains: input.search } }, { metaMessageId: { contains: input.search } }] } : {}) };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.whatsAppMessage.count({ where }),
      this.prisma.whatsAppMessage.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { createdAt: "desc" }, select: { id: true, metaMessageId: true, direction: true, type: true, purpose: true, toPhone: true, status: true, errorCode: true, errorMessage: true, queuedAt: true, submittedAt: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true, createdAt: true, store: { select: { id: true, name: true, code: true } }, phoneNumber: { select: { displayPhoneNumber: true, verifiedName: true } }, templateInstance: { select: { metaTemplateName: true, definition: { select: { key: true, language: true, version: true } } } } } }),
    ]);
    return { items: items.map(item => ({ ...item, friendlyFailureReason: friendlyFailure(item.errorCode, item.errorMessage) })), page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) };
  }
  async get(organizationId: string, id: string) {
    const item = await this.prisma.whatsAppMessage.findFirst({ where: { id, organizationId }, include: { store: { select: { id: true, name: true, code: true } }, phoneNumber: { select: { displayPhoneNumber: true, verifiedName: true } }, templateInstance: { include: { definition: true } }, events: { orderBy: [{ occurredAt: "asc" }, { receivedAt: "asc" }] } } });
    if (!item) throw new Error("MESSAGE_NOT_FOUND");
    return { ...item, friendlyFailureReason: friendlyFailure(item.errorCode, item.errorMessage) };
  }
}
