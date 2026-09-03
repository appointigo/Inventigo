import type { PrismaClient } from "@prisma/client";
import type { TestTenantBootstrapConfig, TestTenantBootstrapResult } from "./types";

export async function bootstrapWhatsAppTestTenant(
  prisma: PrismaClient,
  config: TestTenantBootstrapConfig
): Promise<TestTenantBootstrapResult> {
  if (!config.enabled || (config.runtimeEnvironment !== "development" && config.runtimeEnvironment !== "test")) {
    throw new Error("WhatsApp test-tenant bootstrap is disabled outside development/test");
  }

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findFirst({
      where: { id: config.storeId, orgId: config.organizationId },
      select: { id: true },
    });
    if (!store) throw new Error("The configured test Store does not belong to the configured test Organization");

    let integration = await tx.whatsAppIntegration.findFirst({
      where: {
        organizationId: config.organizationId,
        provider: "META",
        ...(config.metaBusinessId ? { metaBusinessId: config.metaBusinessId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    integration = integration
      ? await tx.whatsAppIntegration.update({
          where: { id: integration.id },
          data: {
            status: "CONNECTED",
            credentialRef: config.credentialRef,
            metaBusinessId: config.metaBusinessId,
            disconnectedAt: null,
          },
        })
      : await tx.whatsAppIntegration.create({
          data: {
            organizationId: config.organizationId,
            provider: "META",
            status: "CONNECTED",
            credentialRef: config.credentialRef,
            metaBusinessId: config.metaBusinessId,
            connectedAt: new Date(),
          },
        });

    const existingWaba = await tx.whatsAppBusinessAccount.findUnique({
      where: { metaWabaId: config.metaWabaId },
      include: { integration: { select: { organizationId: true } } },
    });
    if (existingWaba && existingWaba.integration.organizationId !== config.organizationId) {
      throw new Error("The configured Meta WABA is already assigned to another Organization");
    }
    const waba = await tx.whatsAppBusinessAccount.upsert({
      where: { metaWabaId: config.metaWabaId },
      update: {
        integrationId: integration.id,
        businessName: config.businessName,
        status: "ACTIVE",
      },
      create: {
        integrationId: integration.id,
        metaWabaId: config.metaWabaId,
        businessName: config.businessName,
        status: "ACTIVE",
      },
    });

    const existingPhone = await tx.whatsAppPhoneNumber.findUnique({
      where: { metaPhoneNumberId: config.metaPhoneNumberId },
      include: { waba: { include: { integration: { select: { organizationId: true } } } } },
    });
    if (existingPhone && existingPhone.waba.integration.organizationId !== config.organizationId) {
      throw new Error("The configured Meta phone number is already assigned to another Organization");
    }
    const phone = await tx.whatsAppPhoneNumber.upsert({
      where: { metaPhoneNumberId: config.metaPhoneNumberId },
      update: {
        wabaId: waba.id,
        displayPhoneNumber: config.displayPhoneNumber,
        normalizedPhoneNumber: config.normalizedPhoneNumber,
        verifiedName: config.verifiedName,
        status: "ACTIVE",
      },
      create: {
        wabaId: waba.id,
        metaPhoneNumberId: config.metaPhoneNumberId,
        displayPhoneNumber: config.displayPhoneNumber,
        normalizedPhoneNumber: config.normalizedPhoneNumber,
        verifiedName: config.verifiedName,
        status: "ACTIVE",
      },
    });

    if (config.senderIsDefault) {
      await tx.storeWhatsAppSender.updateMany({
        where: {
          storeId: config.storeId,
          purpose: config.senderPurpose,
          isDefault: true,
          NOT: { phoneNumberId: phone.id },
        },
        data: { isDefault: false },
      });
    }
    const sender = await tx.storeWhatsAppSender.upsert({
      where: {
        storeId_phoneNumberId_purpose: {
          storeId: config.storeId,
          phoneNumberId: phone.id,
          purpose: config.senderPurpose,
        },
      },
      update: {
        isDefault: config.senderIsDefault,
        priority: config.senderPriority,
        isActive: true,
      },
      create: {
        storeId: config.storeId,
        phoneNumberId: phone.id,
        purpose: config.senderPurpose,
        isDefault: config.senderIsDefault,
        priority: config.senderPriority,
        isActive: true,
      },
    });

    let templateInstanceId: string | undefined;
    if (config.template?.confirmedApproved) {
      let definition = await tx.whatsAppTemplateDefinition.findFirst({
        where: {
          organizationId: config.organizationId,
          scope: "ORGANIZATION",
          key: config.template.key,
          version: config.template.version,
          language: config.template.language,
        },
      });
      definition = definition
        ? await tx.whatsAppTemplateDefinition.update({
            where: { id: definition.id },
            data: { isActive: true },
          })
        : await tx.whatsAppTemplateDefinition.create({
            data: {
              organizationId: config.organizationId,
              scope: "ORGANIZATION",
              key: config.template.key,
              version: config.template.version,
              language: config.template.language,
              purpose: config.template.purpose,
              category: config.template.category,
              name: config.template.definitionName,
              body: config.template.body,
              isActive: true,
            },
          });

      if (config.template.metaTemplateId) {
        const existingTemplateId = await tx.whatsAppTemplateInstance.findUnique({
          where: { metaTemplateId: config.template.metaTemplateId },
          select: { wabaId: true },
        });
        if (existingTemplateId && existingTemplateId.wabaId !== waba.id) {
          throw new Error("The configured Meta template ID is already assigned to another WABA");
        }
      }
      const instance = await tx.whatsAppTemplateInstance.upsert({
        where: { wabaId_definitionId: { wabaId: waba.id, definitionId: definition.id } },
        update: {
          metaTemplateId: config.template.metaTemplateId,
          metaTemplateName: config.template.metaTemplateName,
          status: "APPROVED",
          approvedAt: new Date(),
        },
        create: {
          wabaId: waba.id,
          definitionId: definition.id,
          metaTemplateId: config.template.metaTemplateId,
          metaTemplateName: config.template.metaTemplateName,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
      templateInstanceId = instance.id;
    }

    return {
      integrationId: integration.id,
      wabaId: waba.id,
      phoneNumberId: phone.id,
      senderMappingId: sender.id,
      templateInstanceId,
    };
  }, { isolationLevel: "Serializable" });
}

