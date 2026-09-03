import { prisma } from "@/lib/db";
import type {
  Prisma,
  WhatsAppMessagePurpose as PrismaWhatsAppMessagePurpose,
} from "@prisma/client";
import type { WhatsAppRepository } from "./WhatsAppRepository";
import type {
  CreateWhatsAppMessageInput,
  ResolvedWhatsAppSender,
  ResolvedWhatsAppTemplate,
  WhatsAppMessageRecord,
} from "../types";
import { selectSenderMapping } from "./selectSenderMapping";

export class PrismaWhatsAppRepository implements WhatsAppRepository {
  async resolveSender(
    input: Parameters<WhatsAppRepository["resolveSender"]>[0]
  ): Promise<ResolvedWhatsAppSender | null> {
    if (!input.storeId) return null;

    const mappings = await prisma.storeWhatsAppSender.findMany({
      where: {
        ...(input.senderMappingId ? { id: input.senderMappingId } : {}),
        storeId: input.storeId,
        purpose: { in: input.purpose === "DEFAULT" ? ["DEFAULT"] : [input.purpose, "DEFAULT"] },
        isActive: true,
        store: { orgId: input.organizationId, isActive: true },
        phoneNumber: {
          waba: { integration: { organizationId: input.organizationId } },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        purpose: true,
        isDefault: true,
        phoneNumber: {
          select: {
            id: true,
            metaPhoneNumberId: true,
            status: true,
            waba: {
              select: {
                id: true,
                status: true,
                integration: {
                  select: { id: true, status: true, credentialRef: true },
                },
              },
            },
          },
        },
      },
    });

    const selected = selectSenderMapping(mappings, input.purpose);
    if (!selected) return null;
    const { mapping, resolution } = selected;
    const { phoneNumber } = mapping;
    return {
      integrationId: phoneNumber.waba.integration.id,
      integrationStatus: phoneNumber.waba.integration.status,
      credentialRef: phoneNumber.waba.integration.credentialRef,
      wabaId: phoneNumber.waba.id,
      wabaStatus: phoneNumber.waba.status,
      phoneNumberId: phoneNumber.id,
      metaPhoneNumberId: phoneNumber.metaPhoneNumberId,
      phoneNumberStatus: phoneNumber.status,
      resolution,
    };
  }

  async resolveTemplate(
    input: Parameters<WhatsAppRepository["resolveTemplate"]>[0]
  ): Promise<ResolvedWhatsAppTemplate | null> {
    const instances = await prisma.whatsAppTemplateInstance.findMany({
      where: {
        wabaId: input.wabaId,
        definition: {
          key: input.key,
          language: input.language,
          ...(input.version !== undefined ? { version: input.version } : {}),
          isActive: true,
          OR: [
            { scope: "PLATFORM", organizationId: null },
            { scope: "ORGANIZATION", organizationId: input.organizationId },
          ],
        },
        waba: { integration: { organizationId: input.organizationId } },
      },
      orderBy: { definition: { version: "desc" } },
      select: {
        id: true,
        metaTemplateName: true,
        status: true,
        definition: { select: { language: true, version: true, organizationId: true } },
      },
    });

    const organizationInstances = instances.filter(
      (item) => item.definition.organizationId === input.organizationId
    );
    const platformInstances = instances.filter((item) => item.definition.organizationId === null);
    const instance =
      organizationInstances.find((item) => item.status === "APPROVED") ??
      platformInstances.find((item) => item.status === "APPROVED") ??
      organizationInstances[0] ??
      platformInstances[0];

    return instance
      ? {
          templateInstanceId: instance.id,
          metaTemplateName: instance.metaTemplateName,
          language: instance.definition.language,
          version: instance.definition.version,
          status: instance.status,
        }
      : null;
  }

  async createMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessageRecord> {
    const data: Prisma.WhatsAppMessageUncheckedCreateInput = {
      organizationId: input.organizationId,
      storeId: input.storeId ?? null,
      phoneNumberId: input.phoneNumberId,
      templateInstanceId: input.templateInstanceId ?? null,
      campaignRecipientId: input.campaignRecipientId ?? null,
      automationExecutionId: input.automationExecutionId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      direction: "OUTBOUND",
      type: input.content.type,
      purpose: input.purpose as PrismaWhatsAppMessagePurpose,
      fromPhone: input.fromPhone ?? null,
      toPhone: input.to,
      referenceType: input.reference?.type ?? null,
      referenceId: input.reference?.id ?? null,
      payload: JSON.parse(JSON.stringify(input.content)),
      status: "QUEUED",
      queuedAt: new Date(),
    };
    const select = { id: true, status: true, metaMessageId: true } as const;
    const message = input.idempotencyKey
      ? await prisma.whatsAppMessage.upsert({
          where: { idempotencyKey: input.idempotencyKey },
          create: data,
          update: {},
          select,
        })
      : await prisma.whatsAppMessage.create({ data, select });
    return {
      id: message.id,
      status: message.status,
      providerMessageId: message.metaMessageId ?? undefined,
    };
  }

  async claimMessage(messageId: string): Promise<boolean> {
    const result = await prisma.whatsAppMessage.updateMany({
      where: {
        id: messageId,
        metaMessageId: null,
        dispatchClaimedAt: null,
        status: { in: ["QUEUED", "FAILED"] },
      },
      data: {
        dispatchClaimedAt: new Date(),
        status: "QUEUED",
        errorCode: null,
        errorMessage: null,
        failedAt: null,
      },
    });
    return result.count === 1;
  }

  async markSubmitted(input: Parameters<WhatsAppRepository["markSubmitted"]>[0]): Promise<void> {
    await prisma.whatsAppMessage.update({
      where: { id: input.messageId },
      data: {
        metaMessageId: input.providerMessageId,
        status: "SUBMITTED",
        submittedAt: input.submittedAt,
      },
    });
  }

  async markFailed(input: Parameters<WhatsAppRepository["markFailed"]>[0]): Promise<void> {
    await prisma.whatsAppMessage.update({
      where: { id: input.messageId },
      data: {
        status: "FAILED",
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        failedAt: input.failedAt,
        dispatchClaimedAt: null,
      },
    });
  }
}
