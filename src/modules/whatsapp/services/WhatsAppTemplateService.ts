import type { PrismaClient } from "@prisma/client";
import { WhatsAppError } from "../errors.ts";

export class WhatsAppTemplateService {
  constructor(private readonly prisma: PrismaClient) {}
  list(organizationId: string) {
    return this.prisma.whatsAppTemplateInstance.findMany({
      where: { waba: { integration: { organizationId } } },
      select: { id: true, metaTemplateName: true, status: true, rejectionReason: true, submittedAt: true, approvedAt: true, rejectedAt: true, lastSyncedAt: true, definition: { select: { key: true, version: true, language: true, purpose: true, category: true, body: true, footer: true } }, waba: { select: { id: true, metaWabaId: true, businessName: true } } },
      orderBy: [{ definition: { key: "asc" } }, { definition: { version: "desc" } }],
    });
  }
  async get(organizationId: string, id: string) {
    const template = await this.prisma.whatsAppTemplateInstance.findFirst({ where: { id, waba: { integration: { organizationId } } }, select: { id: true, metaTemplateId: true, metaTemplateName: true, status: true, rejectionReason: true, submittedAt: true, approvedAt: true, rejectedAt: true, lastSyncedAt: true, definition: true, waba: { select: { id: true, metaWabaId: true, businessName: true } } } });
    if (!template) throw new WhatsAppError("TEMPLATE_NOT_FOUND", "Template not found");
    return template;
  }
}
