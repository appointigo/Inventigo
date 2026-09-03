export type WhatsAppMessageType =
  | "TEMPLATE"
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "VIDEO"
  | "INTERACTIVE";

export type WhatsAppMessagePurpose =
  | "INVOICE"
  | "PAYMENT"
  | "MARKETING"
  | "ORDER"
  | "SUPPORT"
  | "OTP"
  | "OTHER";

export type WhatsAppSenderPurpose = "DEFAULT" | "TRANSACTIONAL" | "MARKETING" | "SUPPORT";

export type WhatsAppTemplateReference = {
  key: string;
  language: string;
  version?: number;
  variables?: Record<string, string>;
};

export type WhatsAppContent =
  | { type: "TEXT"; text: string }
  | { type: "TEMPLATE"; template: WhatsAppTemplateReference }
  | { type: "IMAGE" | "VIDEO"; mediaUrl: string; caption?: string }
  | { type: "DOCUMENT"; mediaUrl: string; caption?: string; filename?: string }
  | { type: "INTERACTIVE"; content: Record<string, unknown> };

export type SendWhatsAppMessageRequest = {
  organizationId: string;
  storeId?: string;
  to: string;
  purpose: WhatsAppMessagePurpose;
  senderPurpose: WhatsAppSenderPurpose;
  senderMappingId?: string;
  campaignRecipientId?: string;
  automationExecutionId?: string;
  /** Stable business-operation key used to suppress provider duplicates on worker retries. */
  idempotencyKey?: string;
  content: WhatsAppContent;
  reference?: {
    type: string;
    id: string;
  };
};

export type SendWhatsAppMessageResult = {
  messageId: string;
  providerMessageId?: string;
  status: "SUBMITTED" | "FAILED";
};

export type ResolvedWhatsAppSender = {
  integrationId: string;
  integrationStatus:
    | "PENDING"
    | "CONNECTED"
    | "ACTION_REQUIRED"
    | "SUSPENDED"
    | "DISCONNECTED"
    | "ERROR";
  credentialRef: string | null;
  wabaId: string;
  wabaStatus: "PENDING" | "ACTIVE" | "RESTRICTED" | "DISABLED";
  phoneNumberId: string;
  metaPhoneNumberId: string;
  phoneNumberStatus: "PENDING" | "ACTIVE" | "RESTRICTED" | "DISCONNECTED";
  resolution: "EXACT_DEFAULT" | "EXACT_PRIORITY" | "STORE_DEFAULT";
};

export type ActiveWhatsAppSender = ResolvedWhatsAppSender & {
  integrationStatus: "CONNECTED";
  credentialRef: string;
  wabaStatus: "ACTIVE";
  phoneNumberStatus: "ACTIVE";
};

export type ResolvedWhatsAppTemplate = {
  templateInstanceId: string;
  metaTemplateName: string;
  language: string;
  version: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED";
};

export type CreateWhatsAppMessageInput = SendWhatsAppMessageRequest & {
  phoneNumberId: string;
  templateInstanceId?: string;
  fromPhone?: string;
};

export type WhatsAppMessageRecord = {
  id: string;
  status: "QUEUED" | "SUBMITTED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  providerMessageId?: string;
};
