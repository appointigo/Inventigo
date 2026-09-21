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
  httpStatus?: number;
};

export type MetaCodeExchangeResult = { accessToken: string; expiresAt?: Date };
export type MetaCodeExchangeRequest = { code: string };
export type MetaTokenInspection = {
  appId: string;
  isValid: boolean;
  type?: string;
  expiresAt?: Date;
  dataAccessExpiresAt?: Date;
  scopes: string[];
  granularScopes: Array<{ scope: string; targetIds: string[] }>;
};
export type MetaWaba = { id: string; name?: string; currency?: string; timezoneId?: string };
export type MetaPhoneNumber = { id: string; displayPhoneNumber: string; verifiedName?: string; qualityRating?: string; nameStatus?: string; codeVerificationStatus?: string; platformType?: string; status?: string; isPinEnabled?: boolean };
export type MetaTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
export type MetaMessageTemplate = { id: string; name: string; language: string; category: string; status: MetaTemplateStatus; rejectionReason?: string; components?: unknown[] };
export type MetaTemplateComponent =
  | { type: "BODY"; text: string; example?: { bodyText: string[][] } }
  | { type: "FOOTER"; text: string };
export type MetaTemplateContext = {
  organizationId: string;
  credentialRef: string;
  metaWabaId: string;
  requestId?: string;
  templateName?: string;
};
export type MetaResponseDiagnostic = {
  httpStatus: number;
  contentType: string;
  durationMs: number;
};
export type MetaDiagnosticReporter = (diagnostic: MetaResponseDiagnostic) => void;
export type MetaCreateTemplateRequest = MetaTemplateContext & { name: string; language: string; category: "UTILITY" | "MARKETING" | "AUTHENTICATION"; components: MetaTemplateComponent[] };

export interface MetaWhatsAppClient {
  sendMessage(request: MetaSendMessageRequest): Promise<MetaSendMessageResult>;
  exchangeEmbeddedSignupCode(request: MetaCodeExchangeRequest): Promise<MetaCodeExchangeResult>;
  inspectToken(accessToken: string): Promise<MetaTokenInspection>;
  getWaba(wabaId: string, accessToken: string, report?: MetaDiagnosticReporter): Promise<MetaWaba>;
  listPhoneNumbers(wabaId: string, accessToken: string, report?: MetaDiagnosticReporter): Promise<MetaPhoneNumber[]>;
  registerPhoneNumber(phoneNumberId: string, pin: string, accessToken: string): Promise<void>;
  subscribeApp(wabaId: string, accessToken: string, report?: MetaDiagnosticReporter): Promise<void>;
  isAppSubscribed(wabaId: string, appId: string, accessToken: string, report?: MetaDiagnosticReporter): Promise<boolean>;
  listMessageTemplates(input: MetaTemplateContext): Promise<MetaMessageTemplate[]>;
  createMessageTemplate(input: MetaCreateTemplateRequest): Promise<MetaMessageTemplate>;
}
