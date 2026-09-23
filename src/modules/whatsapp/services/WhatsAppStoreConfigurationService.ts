import type { PrismaClient, WhatsAppSenderPurpose } from "@prisma/client";
import { selectSenderMapping } from "../repositories/selectSenderMapping.ts";

export class WhatsAppConfigurationError extends Error {
  constructor(
    readonly code:
      | "STORE_NOT_FOUND"
      | "PHONE_NOT_FOUND"
      | "SENDER_NOT_READY"
      | "MAPPING_NOT_FOUND"
      | "MAPPING_CONFLICT",
    message: string
  ) {
    super(message);
  }
}

export type SenderMappingInput = {
  storeId: string;
  phoneNumberId: string;
  purpose: WhatsAppSenderPurpose;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
};
export type StoreProfileInput = {
  displayName: string;
  signature?: string | null;
  supportPhone?: string | null;
  defaultLanguage: string;
  defaultInvoiceTemplateInstanceId?: string | null;
};

if (typeof window !== "undefined")
  throw new Error("WhatsAppStoreConfigurationService is server-only");

export class WhatsAppStoreConfigurationService {
  constructor(private readonly prisma: PrismaClient) {}
  async snapshot(organizationId: string) {
    const [stores, phoneNumbers] = await Promise.all([
      this.prisma.store.findMany({
        where: { orgId: organizationId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          whatsappProfile: true,
          whatsappSenders: {
            orderBy: [{ purpose: "asc" }, { priority: "asc" }],
            select: {
              id: true,
              phoneNumberId: true,
              purpose: true,
              priority: true,
              isDefault: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.whatsAppPhoneNumber.findMany({
        where: { waba: { integration: { organizationId } } },
        orderBy: { displayPhoneNumber: "asc" },
        select: {
          id: true,
          displayPhoneNumber: true,
          verifiedName: true,
          status: true,
          waba: {
            select: { status: true, businessName: true, integration: { select: { status: true } } },
          },
        },
      }),
    ]);
    return { stores, phoneNumbers };
  }
  private async validateAssets(organizationId: string, input: SenderMappingInput) {
    const [store, phone] = await Promise.all([
      this.prisma.store.findFirst({
        where: { id: input.storeId, orgId: organizationId },
        select: { id: true, isActive: true },
      }),
      this.prisma.whatsAppPhoneNumber.findFirst({
        where: { id: input.phoneNumberId, waba: { integration: { organizationId } } },
        select: {
          id: true,
          status: true,
          waba: { select: { status: true, integration: { select: { status: true } } } },
        },
      }),
    ]);
    if (!store)
      throw new WhatsAppConfigurationError(
        "STORE_NOT_FOUND",
        "Store was not found in this organization"
      );
    if (!phone)
      throw new WhatsAppConfigurationError(
        "PHONE_NOT_FOUND",
        "Phone number was not found in this organization"
      );
    if (
      input.isActive &&
      (!store.isActive ||
        phone.status !== "ACTIVE" ||
        phone.waba.status !== "ACTIVE" ||
        phone.waba.integration.status !== "CONNECTED")
    )
      throw new WhatsAppConfigurationError(
        "SENDER_NOT_READY",
        "Only active Stores and connected Meta phone numbers can be enabled"
      );
  }
  async createMapping(organizationId: string, input: SenderMappingInput) {
    await this.validateAssets(organizationId, input);
    const duplicate = await this.prisma.storeWhatsAppSender.findUnique({
      where: {
        storeId_phoneNumberId_purpose: {
          storeId: input.storeId,
          phoneNumberId: input.phoneNumberId,
          purpose: input.purpose,
        },
      },
      select: { id: true },
    });
    if (duplicate)
      throw new WhatsAppConfigurationError(
        "MAPPING_CONFLICT",
        "This phone number is already mapped to the Store for that purpose"
      );
    return this.prisma.$transaction(async (tx) => {
      if (input.isActive && input.isDefault)
        await tx.storeWhatsAppSender.updateMany({
          where: { storeId: input.storeId, purpose: input.purpose, isDefault: true },
          data: { isDefault: false },
        });
      return tx.storeWhatsAppSender.create({ data: { ...input, isDefault: input.isActive && input.isDefault } });
    });
  }
  async updateMapping(organizationId: string, id: string, input: SenderMappingInput) {
    const current = await this.prisma.storeWhatsAppSender.findFirst({
      where: {
        id,
        store: { orgId: organizationId },
        phoneNumber: { waba: { integration: { organizationId } } },
      },
      select: { id: true },
    });
    if (!current)
      throw new WhatsAppConfigurationError("MAPPING_NOT_FOUND", "Sender mapping was not found");
    await this.validateAssets(organizationId, input);
    const conflict = await this.prisma.storeWhatsAppSender.findFirst({
      where: {
        id: { not: id },
        storeId: input.storeId,
        phoneNumberId: input.phoneNumberId,
        purpose: input.purpose,
      },
      select: { id: true },
    });
    if (conflict)
      throw new WhatsAppConfigurationError(
        "MAPPING_CONFLICT",
        "This phone number is already mapped to the Store for that purpose"
      );
    return this.prisma.$transaction(async (tx) => {
      if (input.isActive && input.isDefault)
        await tx.storeWhatsAppSender.updateMany({
          where: {
            id: { not: id },
            storeId: input.storeId,
            purpose: input.purpose,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      return tx.storeWhatsAppSender.update({
        where: { id },
        data: { ...input, isDefault: input.isActive && input.isDefault },
      });
    });
  }
  async deleteMapping(organizationId: string, id: string) {
    const mapping = await this.prisma.storeWhatsAppSender.findFirst({
      where: {
        id,
        store: { orgId: organizationId },
        phoneNumber: { waba: { integration: { organizationId } } },
      },
      select: { id: true },
    });
    if (!mapping)
      throw new WhatsAppConfigurationError("MAPPING_NOT_FOUND", "Sender mapping was not found");
    await this.prisma.storeWhatsAppSender.delete({ where: { id } });
    return { success: true };
  }
  async getProfile(organizationId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, orgId: organizationId },
      select: { id: true, name: true, code: true, whatsappProfile: true },
    });
    if (!store)
      throw new WhatsAppConfigurationError(
        "STORE_NOT_FOUND",
        "Store was not found in this organization"
      );
    return store;
  }
  async saveProfile(organizationId: string, storeId: string, input: StoreProfileInput) {
    await this.getProfile(organizationId, storeId);
    if (input.defaultInvoiceTemplateInstanceId) {
      const mappings = await this.prisma.storeWhatsAppSender.findMany({
        where: {
          storeId,
          purpose: { in: ["TRANSACTIONAL", "DEFAULT"] },
          isActive: true,
          store: { orgId: organizationId, isActive: true },
          phoneNumber: { waba: { integration: { organizationId } } },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: {
          purpose: true,
          isDefault: true,
          phoneNumber: { select: { wabaId: true } },
        },
      });
      const selected = selectSenderMapping(mappings, "TRANSACTIONAL");
      const template = selected
        ? await this.prisma.whatsAppTemplateInstance.findFirst({
            where: {
              id: input.defaultInvoiceTemplateInstanceId,
              status: "APPROVED",
              wabaId: selected.mapping.phoneNumber.wabaId,
              waba: { integration: { organizationId } },
              definition: { isActive: true, category: "UTILITY", purpose: { in: ["INVOICE", "CUSTOM"] } },
            },
            select: { definition: { select: { header: true } } },
          })
        : null;
      const header = template?.definition.header as Record<string, unknown> | null | undefined;
      if (!template || String(header?.type ?? "").toUpperCase() !== "HEADER" || String(header?.format ?? "").toUpperCase() !== "DOCUMENT")
        throw new WhatsAppConfigurationError("MAPPING_CONFLICT", "Choose an approved document-header invoice template for this Store sender");
    }
    return this.prisma.storeWhatsAppProfile.upsert({
      where: { storeId },
      create: { storeId, ...input },
      update: input,
    });
  }
}
