import type { PrismaClient } from "@prisma/client";
import { WhatsAppError } from "../errors.ts";
import type { WhatsAppEmbeddedSignupService } from "./WhatsAppEmbeddedSignupService.ts";

if (typeof window !== "undefined") throw new Error("WhatsAppAssetService is server-only");

const accountSelect = {
  id: true,
  metaWabaId: true,
  businessName: true,
  status: true,
  timezone: true,
  currency: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { phoneNumbers: true } },
} as const;
const phoneSelect = {
  id: true,
  metaPhoneNumberId: true,
  displayPhoneNumber: true,
  normalizedPhoneNumber: true,
  verifiedName: true,
  qualityRating: true,
  messagingLimitTier: true,
  status: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  waba: { select: { id: true, metaWabaId: true, businessName: true, status: true } },
  storeMappings: {
    where: { isActive: true },
    orderBy: { priority: "desc" as const },
    select: {
      id: true,
      purpose: true,
      isDefault: true,
      priority: true,
      store: { select: { id: true, name: true, code: true, isActive: true } },
    },
  },
} as const;

export class WhatsAppAssetService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly syncService?: WhatsAppEmbeddedSignupService
  ) {}
  listBusinessAccounts(organizationId: string) {
    return this.prisma.whatsAppBusinessAccount.findMany({
      where: { integration: { organizationId } },
      select: accountSelect,
      orderBy: { createdAt: "asc" },
    });
  }
  async getBusinessAccount(organizationId: string, id: string) {
    const account = await this.prisma.whatsAppBusinessAccount.findFirst({
      where: { id, integration: { organizationId } },
      select: {
        ...accountSelect,
        phoneNumbers: { select: phoneSelect, orderBy: { createdAt: "asc" } },
      },
    });
    if (!account)
      throw new WhatsAppError(
        "EMBEDDED_SIGNUP_ASSET_MISMATCH",
        "WhatsApp Business Account was not found"
      );
    return account;
  }
  listPhoneNumbers(organizationId: string) {
    return this.prisma.whatsAppPhoneNumber.findMany({
      where: { waba: { integration: { organizationId } } },
      select: phoneSelect,
      orderBy: { createdAt: "asc" },
    });
  }
  async getPhoneNumber(organizationId: string, id: string) {
    const phone = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: { id, waba: { integration: { organizationId } } },
      select: phoneSelect,
    });
    if (!phone)
      throw new WhatsAppError(
        "EMBEDDED_SIGNUP_ASSET_MISMATCH",
        "WhatsApp phone number was not found"
      );
    return phone;
  }
  async syncBusinessAccount(organizationId: string, id: string) {
    await this.getBusinessAccount(organizationId, id);
    if (!this.syncService) throw new Error("Meta sync is unavailable");
    await this.syncService.sync(organizationId);
    return this.getBusinessAccount(organizationId, id);
  }
  async syncPhoneNumber(organizationId: string, id: string) {
    await this.getPhoneNumber(organizationId, id);
    if (!this.syncService) throw new Error("Meta sync is unavailable");
    await this.syncService.sync(organizationId);
    return this.getPhoneNumber(organizationId, id);
  }
  async disconnectBusinessAccount(organizationId: string, id: string) {
    const account = await this.getBusinessAccount(organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.storeWhatsAppSender.updateMany({
        where: { phoneNumber: { wabaId: id } },
        data: { isActive: false },
      });
      await tx.whatsAppPhoneNumber.updateMany({
        where: { wabaId: id },
        data: { status: "DISCONNECTED" },
      });
      await tx.whatsAppBusinessAccount.update({ where: { id }, data: { status: "DISABLED" } });
      const remaining = await tx.whatsAppBusinessAccount.count({
        where: {
          integrationId: {
            equals: (
              await tx.whatsAppBusinessAccount.findUniqueOrThrow({
                where: { id },
                select: { integrationId: true },
              })
            ).integrationId,
          },
          id: { not: id },
          status: "ACTIVE",
        },
      });
      if (!remaining)
        await tx.whatsAppIntegration.update({
          where: {
            id: (
              await tx.whatsAppBusinessAccount.findUniqueOrThrow({
                where: { id },
                select: { integrationId: true },
              })
            ).integrationId,
          },
          data: { status: "DISCONNECTED", disconnectedAt: new Date() },
        });
    });
    return { id: account.id, status: "DISABLED" as const };
  }
}
