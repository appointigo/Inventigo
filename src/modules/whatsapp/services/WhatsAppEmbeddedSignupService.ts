import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { MetaPhoneNumber, MetaWaba, MetaWhatsAppClient } from "../clients/MetaWhatsAppClient";
import type { WhatsAppCredentialStore } from "../credentials/WhatsAppCredentialStore";
import { WhatsAppError } from "../errors";

export type CompleteEmbeddedSignupInput = {
  organizationId: string;
  code: string;
  selectedWabaIds?: string[];
  registration?: { phoneNumberId: string; pin: string };
};

export class WhatsAppEmbeddedSignupService {
  constructor(private readonly prisma: PrismaClient, private readonly meta: MetaWhatsAppClient, private readonly credentials: WhatsAppCredentialStore, private readonly appId: string) {}

  async complete(input: CompleteEmbeddedSignupInput) {
    const exchange = await this.meta.exchangeEmbeddedSignupCode(input.code);
    const inspection = await this.meta.inspectToken(exchange.accessToken);
    if (!inspection.isValid || inspection.appId !== this.appId) throw new WhatsAppError("META_AUTH_FAILED", "Embedded Signup token is invalid or belongs to another app");
    const grantedScopes = new Set([...inspection.scopes, ...inspection.granularScopes.map(item => item.scope)]);
    if (!["whatsapp_business_management", "whatsapp_business_messaging"].every(scope => grantedScopes.has(scope))) throw new WhatsAppError("META_AUTH_FAILED", "Embedded Signup did not grant the required WhatsApp permissions");
    const discoveredIds = [...new Set(inspection.granularScopes.filter(x => x.scope === "whatsapp_business_management").flatMap(x => x.targetIds))];
    const wabaIds = input.selectedWabaIds?.length ? input.selectedWabaIds : discoveredIds;
    if (!wabaIds.length || wabaIds.some(id => !discoveredIds.includes(id))) throw new WhatsAppError("EMBEDDED_SIGNUP_ASSET_MISMATCH", "Selected WhatsApp account was not granted to this signup token");

    const existingForeign = await this.prisma.whatsAppBusinessAccount.findFirst({ where: { metaWabaId: { in: wabaIds }, integration: { organizationId: { not: input.organizationId } } }, select: { id: true } });
    if (existingForeign) throw new WhatsAppError("EMBEDDED_SIGNUP_ASSET_MISMATCH", "A WhatsApp account cannot be connected across organizations");

    const assets: Array<{ waba: MetaWaba; phones: MetaPhoneNumber[] }> = [];
    for (const wabaId of wabaIds) {
      const [waba, phones] = await Promise.all([this.meta.getWaba(wabaId, exchange.accessToken), this.meta.listPhoneNumbers(wabaId, exchange.accessToken)]);
      if (input.registration && phones.some(p => p.id === input.registration?.phoneNumberId)) await this.meta.registerPhoneNumber(input.registration.phoneNumberId, input.registration.pin, exchange.accessToken);
      await this.meta.subscribeApp(wabaId, exchange.accessToken);
      assets.push({ waba, phones });
    }
    const credentialRef = await this.credentials.save({ organizationId: input.organizationId, accessToken: exchange.accessToken, expiresAt: exchange.expiresAt ?? inspection.expiresAt });
    const now = new Date();
    const integration = await this.prisma.$transaction(async tx => {
      const record = await tx.whatsAppIntegration.upsert({
        where: { organizationId_provider: { organizationId: input.organizationId, provider: "META" } },
        create: { organizationId: input.organizationId, provider: "META", status: assets.some(a => a.phones.length) ? "CONNECTED" : "ACTION_REQUIRED", credentialRef, connectedAt: now, lastSyncedAt: now },
        update: { status: assets.some(a => a.phones.length) ? "CONNECTED" : "ACTION_REQUIRED", credentialRef, connectedAt: now, disconnectedAt: null, lastSyncedAt: now },
      });
      for (const asset of assets) {
        const waba = await tx.whatsAppBusinessAccount.upsert({ where: { metaWabaId: asset.waba.id }, create: {
          integrationId: record.id, metaWabaId: asset.waba.id, businessName: asset.waba.name, currency: asset.waba.currency, timezone: asset.waba.timezoneId, status: "ACTIVE", lastSyncedAt: now,
        }, update: { integrationId: record.id, businessName: asset.waba.name, currency: asset.waba.currency, timezone: asset.waba.timezoneId, status: "ACTIVE", lastSyncedAt: now } });
        for (const phone of asset.phones) await tx.whatsAppPhoneNumber.upsert({ where: { metaPhoneNumberId: phone.id }, create: {
          wabaId: waba.id, metaPhoneNumberId: phone.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: phone.codeVerificationStatus === "VERIFIED" || input.registration?.phoneNumberId === phone.id ? "ACTIVE" : "PENDING", lastSyncedAt: now,
        }, update: { wabaId: waba.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: phone.codeVerificationStatus === "VERIFIED" || input.registration?.phoneNumberId === phone.id ? "ACTIVE" : "PENDING", lastSyncedAt: now } });
      }
      return record;
    });
    return { integrationId: integration.id, status: integration.status, wabaCount: assets.length, phoneNumberCount: assets.reduce((n, a) => n + a.phones.length, 0) };
  }

  async sync(organizationId: string) {
    const integration = await this.prisma.whatsAppIntegration.findUnique({
      where: { organizationId_provider: { organizationId, provider: "META" } },
      include: { businessAccounts: { select: { metaWabaId: true } } },
    });
    if (!integration?.credentialRef) throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected");
    const token = await this.credentials.resolve(integration.credentialRef, organizationId);
    const now = new Date();
    let phoneNumberCount = 0;
    for (const existing of integration.businessAccounts) {
      const [waba, phones] = await Promise.all([this.meta.getWaba(existing.metaWabaId, token), this.meta.listPhoneNumbers(existing.metaWabaId, token)]);
      await this.meta.subscribeApp(waba.id, token);
      const savedWaba = await this.prisma.whatsAppBusinessAccount.update({ where: { metaWabaId: waba.id }, data: { businessName: waba.name, currency: waba.currency, timezone: waba.timezoneId, status: "ACTIVE", lastSyncedAt: now } });
      for (const phone of phones) await this.prisma.whatsAppPhoneNumber.upsert({ where: { metaPhoneNumberId: phone.id }, create: {
        wabaId: savedWaba.id, metaPhoneNumberId: phone.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: phone.codeVerificationStatus === "VERIFIED" ? "ACTIVE" : "PENDING", lastSyncedAt: now,
      }, update: { displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: phone.codeVerificationStatus === "VERIFIED" ? "ACTIVE" : "PENDING", lastSyncedAt: now } });
      phoneNumberCount += phones.length;
    }
    const status = phoneNumberCount ? "CONNECTED" : "ACTION_REQUIRED";
    await this.prisma.whatsAppIntegration.update({ where: { id: integration.id }, data: { status, lastSyncedAt: now } });
    return { integrationId: integration.id, status, wabaCount: integration.businessAccounts.length, phoneNumberCount };
  }
}
