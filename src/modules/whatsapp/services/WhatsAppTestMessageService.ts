import type { PrismaClient, WhatsAppSenderPurpose } from "@prisma/client";
import type { CommunicationService } from "../../communication/services/CommunicationService.ts";
import type { z } from "zod";
import type { testMessageSchema } from "../messageSchemas.ts";
import type { WhatsAppMessagingReadinessService } from "./WhatsAppMessagingReadinessService.ts";

const messagePurpose = { DEFAULT: "OTHER", TRANSACTIONAL: "INVOICE", MARKETING: "MARKETING", SUPPORT: "SUPPORT" } as const;

export class WhatsAppTestMessageService {
  constructor(private readonly prisma: PrismaClient, private readonly readiness: WhatsAppMessagingReadinessService, private readonly communication: CommunicationService) {}
  async options(organizationId: string) {
    const [stores, templates] = await Promise.all([
      this.prisma.store.findMany({ where: { orgId: organizationId, isActive: true, whatsappSenders: { some: { isActive: true, phoneNumber: { waba: { integration: { organizationId } } } } } }, select: { id: true, name: true, code: true, whatsappSenders: { where: { isActive: true }, select: { purpose: true, isDefault: true, priority: true, phoneNumber: { select: { displayPhoneNumber: true, verifiedName: true, status: true } } }, orderBy: [{ priority: "asc" }] } }, orderBy: { name: "asc" } }),
      this.prisma.whatsAppTemplateInstance.findMany({ where: { status: "APPROVED", waba: { integration: { organizationId } }, definition: { isActive: true } }, select: { id: true, metaTemplateName: true, definition: { select: { key: true, version: true, language: true, purpose: true, body: true, variables: true } }, waba: { select: { id: true, businessName: true } } }, orderBy: { metaTemplateName: "asc" } }),
    ]);
    return { stores, templates };
  }
  async send(organizationId: string, input: z.infer<typeof testMessageSchema>) {
    const readiness = await this.readiness.getMessagingReadiness({ organizationId, storeId: input.storeId, purpose: input.senderPurpose as WhatsAppSenderPurpose });
    if (readiness.overallStatus !== "READY") return { sent: false as const, readiness };
    const instance = await this.prisma.whatsAppTemplateInstance.findFirst({ where: { status: "APPROVED", waba: { integration: { organizationId } }, definition: { key: input.template.key, language: input.template.language, ...(input.template.version ? { version: input.template.version } : {}), isActive: true } }, select: { definition: { select: { variables: true } } } });
    if (!instance) throw new Error("Approved template not found");
    const definitions = Array.isArray(instance.definition.variables) ? instance.definition.variables as Array<{ position?: unknown; key?: unknown }> : [];
    const positionalVariables: Record<string, string> = {};
    for (const variable of definitions) {
      if (typeof variable.position !== "number" || typeof variable.key !== "string" || !input.variables[variable.key]?.trim()) throw new Error(`Template variable ${String(variable.key ?? "unknown")} is required`);
      positionalVariables[String(variable.position)] = input.variables[variable.key].trim();
    }
    const result = await this.communication.send({ channel: "WHATSAPP", message: { organizationId, storeId: input.storeId, to: input.recipient.replace(/^\+/, ""), purpose: messagePurpose[input.senderPurpose], senderPurpose: input.senderPurpose, content: { type: "TEMPLATE", template: { ...input.template, variables: positionalVariables } }, reference: { type: "TEST_MESSAGE", id: crypto.randomUUID() } } });
    return { sent: true as const, result };
  }
}
