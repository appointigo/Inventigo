import type { WhatsAppContent } from "../types";

/**
 * Provider-neutral input to the Meta transport boundary.
 *
 * P07 will map this contract to verified Graph API URLs, versions, auth, and
 * payload shapes. Domain/application code must not construct Graph payloads.
 */
export type MetaSendMessageRequest = {
  organizationId: string;
  credentialRef: string;
  metaPhoneNumberId: string;
  recipient: string;
  content: WhatsAppContent;
  template?: {
    metaTemplateName: string;
    language: string;
  };
};

export type MetaSendMessageResult = {
  providerMessageId: string;
  acceptedAt: Date;
};

export type MetaCodeExchangeResult = { accessToken: string; expiresAt?: Date };
export type MetaTokenInspection = { appId: string; isValid: boolean; expiresAt?: Date; scopes: string[]; granularScopes: Array<{ scope: string; targetIds: string[] }> };
export type MetaWaba = { id: string; name?: string; currency?: string; timezoneId?: string };
export type MetaPhoneNumber = { id: string; displayPhoneNumber: string; verifiedName?: string; qualityRating?: string; codeVerificationStatus?: string; platformType?: string };
export type MetaTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
export type MetaMessageTemplate = { id: string; name: string; language: string; category: string; status: MetaTemplateStatus; rejectionReason?: string };
export type MetaTemplateComponent =
  | { type: "BODY"; text: string; example?: { bodyText: string[][] } }
  | { type: "FOOTER"; text: string };
export type MetaTemplateContext = { organizationId: string; credentialRef: string; metaWabaId: string };
export type MetaCreateTemplateRequest = MetaTemplateContext & { name: string; language: string; category: "UTILITY" | "MARKETING" | "AUTHENTICATION"; components: MetaTemplateComponent[] };

export interface MetaWhatsAppClient {
  sendMessage(request: MetaSendMessageRequest): Promise<MetaSendMessageResult>;
  exchangeEmbeddedSignupCode(code: string): Promise<MetaCodeExchangeResult>;
  inspectToken(accessToken: string): Promise<MetaTokenInspection>;
  getWaba(wabaId: string, accessToken: string): Promise<MetaWaba>;
  listPhoneNumbers(wabaId: string, accessToken: string): Promise<MetaPhoneNumber[]>;
  registerPhoneNumber(phoneNumberId: string, pin: string, accessToken: string): Promise<void>;
  subscribeApp(wabaId: string, accessToken: string): Promise<void>;
  listMessageTemplates(input: MetaTemplateContext): Promise<MetaMessageTemplate[]>;
  createMessageTemplate(input: MetaCreateTemplateRequest): Promise<MetaMessageTemplate>;
}
