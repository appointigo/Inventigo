import type { PrismaClient } from "@prisma/client";
import { WhatsAppError } from "../errors.ts";
import { merchantMarketingBlueprints } from "../templates/blueprints.ts";

export class WhatsAppTemplateService {
  constructor(private readonly prisma: PrismaClient) {}
  async creationOptions(organizationId: string) {
    const integration = await this.prisma.whatsAppIntegration.findUnique({
      where: { organizationId_provider: { organizationId, provider: "META" } },
      select: {
        status: true,
        credentialRef: true,
        businessAccounts: {
          where: { status: "ACTIVE" },
          select: { id: true, businessName: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (
      integration?.status !== "CONNECTED" ||
      !integration.credentialRef ||
      integration.businessAccounts.length === 0
    ) {
      return {
        allowed: false as const,
        code: "WABA_NOT_CONNECTED" as const,
        message: "Connect a WhatsApp Business Account before creating a template.",
        wabas: [],
      };
    }
    return {
      allowed: true as const,
      wabas: integration.businessAccounts,
      blueprints: merchantMarketingBlueprints.map(blueprint => ({
        id: blueprint.id,
        key: blueprint.key,
        displayLabel: blueprint.displayLabel,
        description: blueprint.description,
        version: blueprint.version,
        language: blueprint.language,
        category: blueprint.category,
        purpose: blueprint.purpose,
        body: blueprint.body,
        footer: blueprint.footer ?? null,
        variables: blueprint.variables,
        namePattern: blueprint.namePattern,
      })),
    };
  }
  list(organizationId: string) {
    return this.prisma.whatsAppTemplateInstance.findMany({
      where: { waba: { integration: { organizationId } } },
      select: { id: true, metaTemplateId: true, metaTemplateName: true, status: true, rejectionReason: true, submittedAt: true, approvedAt: true, rejectedAt: true, lastSyncedAt: true, definition: { select: { key: true, version: true, language: true, purpose: true, category: true, source: true, displayLabel: true, body: true, footer: true, _count: { select: { campaigns: true, automations: true } } } }, waba: { select: { id: true, metaWabaId: true, businessName: true } } },
      orderBy: [{ definition: { key: "asc" } }, { definition: { version: "desc" } }],
    });
  }
  async get(organizationId: string, id: string) {
    const template = await this.prisma.whatsAppTemplateInstance.findFirst({ where: { id, waba: { integration: { organizationId } } }, select: { id: true, metaTemplateId: true, metaTemplateName: true, status: true, rejectionReason: true, submittedAt: true, approvedAt: true, rejectedAt: true, lastSyncedAt: true, definition: { select: { key: true, version: true, language: true, purpose: true, category: true, source: true, displayLabel: true, body: true, footer: true, header: true, buttons: true, variables: true, _count: { select: { campaigns: true, automations: true } } } }, waba: { select: { id: true, metaWabaId: true, businessName: true } } } });
    if (!template) throw new WhatsAppError("TEMPLATE_NOT_FOUND", "Template not found");
    return template;
  }
  async removeFromStockiva(organizationId: string, id: string) {
    const template = await this.prisma.whatsAppTemplateInstance.findFirst({
      where: { id, waba: { integration: { organizationId } } },
      select: {
        id: true,
        definitionId: true,
        definition: {
          select: {
            source: true,
            _count: { select: { instances: true, campaigns: true, automations: true } },
          },
        },
      },
    });
    if (!template) throw new WhatsAppError("TEMPLATE_NOT_FOUND", "Template not found");
    if (template.definition.source !== "MERCHANT")
      throw new WhatsAppError("TEMPLATE_DELETE_FAILED", "Only merchant templates can be removed from Stockiva");
    if (template.definition._count.campaigns || template.definition._count.automations)
      throw new WhatsAppError("TEMPLATE_DELETE_FAILED", "This template is still used by a campaign or automation");
    await this.prisma.$transaction(async tx => {
      await tx.whatsAppTemplateInstance.delete({ where: { id: template.id } });
      if (template.definition._count.instances === 1)
        await tx.whatsAppTemplateDefinition.delete({ where: { id: template.definitionId } });
    });
    return { removed: true, deletedFromMeta: false };
  }
}
