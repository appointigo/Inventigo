import type {
  CreateWhatsAppMessageInput,
  ResolvedWhatsAppSender,
  ResolvedWhatsAppTemplate,
  WhatsAppMessageRecord,
  WhatsAppSenderPurpose,
} from "../types";

export interface WhatsAppRepository {
  resolveSender(input: {
    organizationId: string;
    storeId?: string;
    purpose: WhatsAppSenderPurpose;
    senderMappingId?: string;
  }): Promise<ResolvedWhatsAppSender | null>;

  resolveTemplate(input: {
    organizationId: string;
    wabaId: string;
    key: string;
    language: string;
    version?: number;
  }): Promise<ResolvedWhatsAppTemplate | null>;

  createMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessageRecord>;
  claimMessage(messageId: string): Promise<boolean>;

  markSubmitted(input: {
    messageId: string;
    providerMessageId: string;
    submittedAt: Date;
  }): Promise<void>;

  markFailed(input: {
    messageId: string;
    errorCode: string;
    errorMessage: string;
    failedAt: Date;
  }): Promise<void>;
}
