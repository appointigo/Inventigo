import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { MetaPhoneNumber, MetaWaba, MetaWhatsAppClient } from "../clients/MetaWhatsAppClient";
import type { WhatsAppCredentialStore } from "../credentials/WhatsAppCredentialStore";
import { WhatsAppError } from "../errors";
import { isEmbeddedSignupPhoneRegistered, selectEmbeddedSignupPhoneNumber, validateEmbeddedSignupAuthorization } from "../embeddedSignupAuthorization";
import { earliestMetaCredentialExpiry } from "../metaCredentialExpiry";

export type CompleteEmbeddedSignupInput = {
  organizationId: string;
  requestId?: string;
  code: string;
  selectedWabaIds?: string[];
  selectedPhoneNumberId?: string;
  registration?: { phoneNumberId: string; pin: string };
};

type SignupStage =
  | "code_exchange_started"
  | "code_exchange_completed"
  | "token_inspection_started"
  | "token_inspection_completed"
  | "meta_assets_fetch_started"
  | "waba_discovered"
  | "phone_numbers_discovered"
  | "phone_registration_status_checked"
  | "webhook_subscription_completed"
  | "meta_configuration_verified"
  | "credential_persistence_completed"
  | "persistence_started"
  | "integration_connected";

type SignupStageReporter = (stage: SignupStage, details?: Record<string, unknown>) => void;

export class WhatsAppEmbeddedSignupService {
  constructor(private readonly prisma: PrismaClient, private readonly meta: MetaWhatsAppClient, private readonly credentials: WhatsAppCredentialStore, private readonly appId: string) {}

  async complete(input: CompleteEmbeddedSignupInput, report: SignupStageReporter = () => undefined) {
    report("code_exchange_started", { authorizationCodePresent: Boolean(input.code) });
    const exchange = await this.meta.exchangeEmbeddedSignupCode({ code: input.code });
    report("code_exchange_completed", { accessTokenReceived: Boolean(exchange.accessToken) });
    report("token_inspection_started");
    const inspection = await this.meta.inspectToken(exchange.accessToken);
    report("token_inspection_completed", {
      tokenValid: inspection.isValid,
      tokenAppMatches: inspection.appId === this.appId,
      tokenType: inspection.type,
      tokenExpiresAtPresent: Boolean(inspection.expiresAt),
      dataAccessExpiresAtPresent: Boolean(inspection.dataAccessExpiresAt),
      grantedScopeCount: inspection.scopes.length + inspection.granularScopes.length,
    });
    const wabaIds = validateEmbeddedSignupAuthorization({
      inspection,
      expectedAppId: this.appId,
      selectedWabaIds: input.selectedWabaIds,
    });

    const existingForeign = await this.prisma.whatsAppBusinessAccount.findFirst({ where: { metaWabaId: { in: wabaIds }, integration: { organizationId: { not: input.organizationId } } }, select: { id: true } });
    if (existingForeign) throw new WhatsAppError("WABA_ALREADY_LINKED", "This WhatsApp Business Account is already linked to another organization");

    const assets: Array<{ waba: MetaWaba; phones: MetaPhoneNumber[]; ready: boolean }> = [];
    for (const wabaId of wabaIds) {
      report("meta_assets_fetch_started", { wabaId });
      const [waba, phones] = await Promise.all([this.meta.getWaba(wabaId, exchange.accessToken), this.meta.listPhoneNumbers(wabaId, exchange.accessToken)]);
      report("waba_discovered", { wabaId: waba.id });
      report("phone_numbers_discovered", { wabaId: waba.id, phoneNumberCount: phones.length });
      const selectedPhone = selectEmbeddedSignupPhoneNumber(phones, input.selectedPhoneNumberId);
      const phoneAlreadyRegistered = isEmbeddedSignupPhoneRegistered(selectedPhone);
      report("phone_registration_status_checked", {
        phoneNumberId: selectedPhone.id,
        phoneStatus: selectedPhone.status,
        registrationRequired: !phoneAlreadyRegistered,
      });
      const existingForeignPhone = await this.prisma.whatsAppPhoneNumber.findFirst({
        where: {
          metaPhoneNumberId: selectedPhone.id,
          waba: { integration: { organizationId: { not: input.organizationId } } },
        },
        select: { id: true },
      });
      if (existingForeignPhone) throw new WhatsAppError("PHONE_ALREADY_LINKED", "This WhatsApp phone number is already linked to another organization");
      if (!phoneAlreadyRegistered) {
        if (!input.registration) throw new WhatsAppError(
          "PHONE_REGISTRATION_REQUIRED",
          "This WhatsApp phone number requires Cloud API registration",
          { details: { phoneNumberId: selectedPhone.id } }
        );
        if (selectedPhone.id !== input.registration.phoneNumberId) throw new WhatsAppError(
          "EMBEDDED_SIGNUP_ASSET_MISMATCH",
          "Registration phone number does not match the selected WhatsApp phone number"
        );
        await this.meta.registerPhoneNumber(input.registration.phoneNumberId, input.registration.pin, exchange.accessToken);
      }
      await this.meta.subscribeApp(wabaId, exchange.accessToken);
      report("webhook_subscription_completed", { wabaId });
      const [verifiedWaba, verifiedPhones, appSubscribed] = await Promise.all([
        this.meta.getWaba(wabaId, exchange.accessToken),
        this.meta.listPhoneNumbers(wabaId, exchange.accessToken),
        this.meta.isAppSubscribed(wabaId, this.appId, exchange.accessToken),
      ]);
      const verifiedPhone = verifiedPhones.find(phone => phone.id === selectedPhone.id);
      if (!verifiedPhone) throw new WhatsAppError("META_INVALID_RESPONSE", "The selected WhatsApp phone number was missing during verification");
      const phoneConnected = isEmbeddedSignupPhoneRegistered(verifiedPhone);
      const ready = phoneConnected && appSubscribed;
      report("meta_configuration_verified", {
        wabaId: verifiedWaba.id,
        phoneNumberId: verifiedPhone.id,
        phoneStatus: verifiedPhone.status,
        appSubscribed,
        ready,
      });
      assets.push({ waba: verifiedWaba, phones: [verifiedPhone], ready });
    }
    const credentialRef = await this.credentials.save({
      organizationId: input.organizationId,
      accessToken: exchange.accessToken,
      expiresAt: earliestMetaCredentialExpiry(exchange.expiresAt, inspection.expiresAt, inspection.dataAccessExpiresAt),
    });
    report("credential_persistence_completed");
    const now = new Date();
    const integrationStatus = assets.length > 0 && assets.every(asset => asset.ready) ? "CONNECTED" : "ACTION_REQUIRED";
    report("persistence_started", { wabaCount: assets.length, phoneNumberCount: assets.reduce((n, asset) => n + asset.phones.length, 0) });
    const integration = await this.prisma.$transaction(async tx => {
      const record = await tx.whatsAppIntegration.upsert({
        where: { organizationId_provider: { organizationId: input.organizationId, provider: "META" } },
        create: { organizationId: input.organizationId, provider: "META", status: integrationStatus, credentialRef, connectedAt: integrationStatus === "CONNECTED" ? now : null, lastSyncedAt: now },
        update: { status: integrationStatus, credentialRef, connectedAt: integrationStatus === "CONNECTED" ? now : null, disconnectedAt: null, lastSyncedAt: now },
      });
      for (const asset of assets) {
        const waba = await tx.whatsAppBusinessAccount.upsert({ where: { metaWabaId: asset.waba.id }, create: {
          integrationId: record.id, metaWabaId: asset.waba.id, businessName: asset.waba.name, currency: asset.waba.currency, timezone: asset.waba.timezoneId, status: "ACTIVE", lastSyncedAt: now,
        }, update: { integrationId: record.id, businessName: asset.waba.name, currency: asset.waba.currency, timezone: asset.waba.timezoneId, status: "ACTIVE", lastSyncedAt: now } });
        for (const phone of asset.phones) await tx.whatsAppPhoneNumber.upsert({ where: { metaPhoneNumberId: phone.id }, create: {
          wabaId: waba.id, metaPhoneNumberId: phone.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: isEmbeddedSignupPhoneRegistered(phone) ? "ACTIVE" : "PENDING", lastSyncedAt: now,
        }, update: { wabaId: waba.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: isEmbeddedSignupPhoneRegistered(phone) ? "ACTIVE" : "PENDING", lastSyncedAt: now } });
      }
      return record;
    });
    report("integration_connected", { integrationId: integration.id, status: integration.status });
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
    let verifiedWabaCount = 0;
    for (const existing of integration.businessAccounts) {
      const initialWaba = await this.meta.getWaba(existing.metaWabaId, token);
      await this.meta.subscribeApp(initialWaba.id, token);
      const [waba, phones, appSubscribed] = await Promise.all([
        this.meta.getWaba(existing.metaWabaId, token),
        this.meta.listPhoneNumbers(existing.metaWabaId, token),
        this.meta.isAppSubscribed(existing.metaWabaId, this.appId, token),
      ]);
      const savedWaba = await this.prisma.whatsAppBusinessAccount.update({ where: { metaWabaId: waba.id }, data: { businessName: waba.name, currency: waba.currency, timezone: waba.timezoneId, status: "ACTIVE", lastSyncedAt: now } });
      for (const phone of phones) await this.prisma.whatsAppPhoneNumber.upsert({ where: { metaPhoneNumberId: phone.id }, create: {
        wabaId: savedWaba.id, metaPhoneNumberId: phone.id, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: isEmbeddedSignupPhoneRegistered(phone) ? "ACTIVE" : "PENDING", lastSyncedAt: now,
      }, update: { displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, qualityRating: phone.qualityRating, status: isEmbeddedSignupPhoneRegistered(phone) ? "ACTIVE" : "PENDING", lastSyncedAt: now } });
      phoneNumberCount += phones.length;
      if (appSubscribed && phones.some(isEmbeddedSignupPhoneRegistered)) verifiedWabaCount += 1;
    }
    const status = integration.businessAccounts.length > 0 && verifiedWabaCount === integration.businessAccounts.length ? "CONNECTED" : "ACTION_REQUIRED";
    await this.prisma.whatsAppIntegration.update({ where: { id: integration.id }, data: { status, lastSyncedAt: now } });
    return { integrationId: integration.id, status, wabaCount: integration.businessAccounts.length, phoneNumberCount };
  }
}
