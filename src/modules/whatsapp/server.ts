import "server-only";
import { prisma } from "@/lib/db";
import { HttpMetaWhatsAppClient } from "./clients/HttpMetaWhatsAppClient";
import { PrismaWhatsAppCredentialStore } from "./credentials/PrismaWhatsAppCredentialStore";
import { getWhatsAppPlatformConfig, WhatsAppPlatformConfigurationError } from "./config";
import { WhatsAppEmbeddedSignupService } from "./services/WhatsAppEmbeddedSignupService";
import { WhatsAppAssetService } from "./services/WhatsAppAssetService";
import { WhatsAppStoreConfigurationService } from "./services/WhatsAppStoreConfigurationService";
import { WhatsAppOverviewService } from "./services/WhatsAppOverviewService";
import { WhatsAppTemplateReconciliationService } from "./services/WhatsAppTemplateReconciliationService";
import { WhatsAppMessagingReadinessService } from "./services/WhatsAppMessagingReadinessService";
import { WhatsAppTemplateService } from "./services/WhatsAppTemplateService";
import { WhatsAppWebhookService } from "./services/WhatsAppWebhookService";
import { WhatsAppMessageActivityService } from "./services/WhatsAppMessageActivityService";
import { PrismaWhatsAppRepository } from "./repositories/PrismaWhatsAppRepository";
import { WhatsAppService } from "./services/WhatsAppService";
import { CommunicationService } from "../communication/services/CommunicationService";
import { WhatsAppTestMessageService } from "./services/WhatsAppTestMessageService";
import { WhatsAppContactService } from "./services/WhatsAppContactService";
import { WhatsAppCampaignService } from "./services/WhatsAppCampaignService";
import { WhatsAppCampaignExecutionService } from "./services/WhatsAppCampaignExecutionService";
import { PrismaCampaignJobQueue } from "./queue/PrismaCampaignJobQueue";
import { WhatsAppCampaignMetricsService } from "./services/WhatsAppCampaignMetricsService";
import { WhatsAppAutomationService } from "./services/WhatsAppAutomationService";
import { WhatsAppConversationService } from "./services/WhatsAppConversationService";
import { WhatsAppIntegrationHealthService } from "./services/WhatsAppIntegrationHealthService";

export const createWhatsAppAssetReader = () => new WhatsAppAssetService(prisma);
export const createWhatsAppStoreConfigurationService = () =>
  new WhatsAppStoreConfigurationService(prisma);
export const createWhatsAppOverviewService = () => new WhatsAppOverviewService(prisma);
export const createWhatsAppReadinessService = () => new WhatsAppMessagingReadinessService(prisma);
export const createWhatsAppTemplateService = () => new WhatsAppTemplateService(prisma);
export const createWhatsAppWebhookService = () => new WhatsAppWebhookService(prisma);
export const createWhatsAppMessageActivityService = () =>
  new WhatsAppMessageActivityService(prisma);
export const createWhatsAppContactService = () => new WhatsAppContactService(prisma);
export const createWhatsAppCampaignService = () => new WhatsAppCampaignService(prisma);
export const createWhatsAppCampaignMetricsService = () =>
  new WhatsAppCampaignMetricsService(prisma);
export const createWhatsAppCampaignControlService = () =>
  new WhatsAppCampaignExecutionService(prisma, new PrismaCampaignJobQueue(prisma));
export const createWhatsAppAutomationReader = () => new WhatsAppAutomationService(prisma);
export const createWhatsAppConversationService = () => new WhatsAppConversationService(prisma);
export const createWhatsAppIntegrationHealthService = () =>
  new WhatsAppIntegrationHealthService(prisma);

export function createWhatsAppCampaignExecutionService() {
  const backend = createMetaBackend();
  return new WhatsAppCampaignExecutionService(
    prisma,
    new PrismaCampaignJobQueue(prisma),
    backend.communication
  );
}
export function createWhatsAppAutomationWorker() {
  return new WhatsAppAutomationService(prisma, createMetaBackend().communication);
}

export function createMetaBackend() {
  const config = getWhatsAppPlatformConfig();
  if (!config.enabled || !config.meta)
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_DISABLED",
      "WhatsApp is not enabled"
    );
  const credentials = new PrismaWhatsAppCredentialStore(
    prisma,
    config.meta.credentialEncryptionKey
  );
  const client = new HttpMetaWhatsAppClient(config.meta, credentials);
  const signup = new WhatsAppEmbeddedSignupService(prisma, client, credentials, config.meta.appId);
  const communication = new CommunicationService(
    new WhatsAppService(new PrismaWhatsAppRepository(), client)
  );
  const readiness = new WhatsAppMessagingReadinessService(prisma);
  return {
    config: config.meta,
    credentials,
    client,
    signup,
    communication,
    testMessages: new WhatsAppTestMessageService(prisma, readiness, communication),
    assets: new WhatsAppAssetService(prisma, signup),
    templates: new WhatsAppTemplateReconciliationService(prisma, client),
  };
}
