import type { Prisma, PrismaClient, WhatsAppTemplateStatus } from "@prisma/client";
import type { z } from "zod";
import type { MetaWhatsAppClient } from "../clients/MetaWhatsAppClient.ts";
import { isWhatsAppError, WhatsAppError } from "../errors.ts";
import type { merchantTemplateDraftSchema } from "../templateCreationSchemas.ts";

type MerchantTemplateInput = z.infer<typeof merchantTemplateDraftSchema>;

export class WhatsAppMerchantTemplateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly meta: MetaWhatsAppClient
  ) {}

  async create(organizationId: string, input: MerchantTemplateInput) {
    const waba = await this.prisma.whatsAppBusinessAccount.findFirst({
      where: {
        id: input.wabaId,
        status: "ACTIVE",
        integration: {
          organizationId,
          status: "CONNECTED",
          credentialRef: { not: null },
        },
      },
      select: {
        id: true,
        metaWabaId: true,
        integration: { select: { credentialRef: true } },
      },
    });
    if (!waba?.integration.credentialRef)
      throw new WhatsAppError(
        "WHATSAPP_NOT_CONNECTED",
        "The selected WhatsApp Business Account is not connected"
      );

    const local = await this.prisma.whatsAppTemplateInstance.findFirst({
      where: {
        wabaId: waba.id,
        metaTemplateName: input.metaTemplateName,
        definition: { language: input.language },
      },
      select: { id: true },
    });
    if (local)
      throw new WhatsAppError(
        "TEMPLATE_ALREADY_EXISTS",
        "A template with this name and language already exists for the selected WABA"
      );

    const context = {
      organizationId,
      credentialRef: waba.integration.credentialRef,
      metaWabaId: waba.metaWabaId,
      templateName: input.metaTemplateName,
    };

    try {
      const remoteTemplates = await this.meta.listMessageTemplates(context);
      if (
        remoteTemplates.some(
          template =>
            template.name === input.metaTemplateName &&
            template.language === input.language
        )
      ) {
        throw new WhatsAppError(
          "TEMPLATE_ALREADY_EXISTS",
          "A template with this name and language already exists in Meta"
        );
      }

      const remote = await this.meta.createMessageTemplate({
        ...context,
        name: input.metaTemplateName,
        language: input.language,
        category: "MARKETING",
        components: [
          {
            type: "BODY",
            text: input.body,
            ...(input.variables.length
              ? {
                  example: {
                    bodyText: [input.variables.map(variable => variable.example)],
                  },
                }
              : {}),
          },
          ...(input.footer ? [{ type: "FOOTER" as const, text: input.footer }] : []),
        ],
      });
      const now = new Date();
      const status = remote.status as WhatsAppTemplateStatus;
      const result = await this.prisma.$transaction(async tx => {
        const definition = await tx.whatsAppTemplateDefinition.create({
          data: {
            organizationId,
            scope: "ORGANIZATION",
            source: "MERCHANT",
            key: input.metaTemplateName,
            version: 1,
            language: input.language,
            purpose: input.purpose,
            category: "MARKETING",
            name: input.metaTemplateName,
            displayLabel: input.displayLabel,
            body: input.body,
            footer: input.footer || null,
            variables: input.variables as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        return tx.whatsAppTemplateInstance.create({
          data: {
            definitionId: definition.id,
            wabaId: waba.id,
            metaTemplateId: remote.id,
            metaTemplateName: remote.name,
            status,
            rejectionReason: remote.rejectionReason ?? null,
            submittedAt: now,
            approvedAt: status === "APPROVED" ? now : null,
            rejectedAt: status === "REJECTED" ? now : null,
            lastSyncedAt: now,
          },
          select: {
            id: true,
            metaTemplateId: true,
            metaTemplateName: true,
            status: true,
            submittedAt: true,
          },
        });
      });
      return { ...result, source: "MERCHANT" as const };
    } catch (error) {
      if (
        isWhatsAppError(error) &&
        error.code === "TEMPLATE_ALREADY_EXISTS"
      ) throw error;
      throw new WhatsAppError(
        "TEMPLATE_CREATE_FAILED",
        "The template could not be submitted to Meta",
        {
          retryable: isWhatsAppError(error) ? error.retryable : false,
          cause: error,
          details: isWhatsAppError(error) ? error.details : undefined,
        }
      );
    }
  }
}
