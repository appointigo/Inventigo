import type { WhatsAppRepository } from "../repositories/WhatsAppRepository";
import type {
  CreateWhatsAppMessageInput,
  ResolvedWhatsAppSender,
  ResolvedWhatsAppTemplate,
  WhatsAppMessageRecord,
} from "../types";

export class MockWhatsAppRepository implements WhatsAppRepository {
  sender: ResolvedWhatsAppSender | null = null;
  template: ResolvedWhatsAppTemplate | null = null;
  createdMessages: CreateWhatsAppMessageInput[] = [];
  submittedMessages: Parameters<WhatsAppRepository["markSubmitted"]>[0][] = [];
  failedMessages: Parameters<WhatsAppRepository["markFailed"]>[0][] = [];
  resolveSenderInputs: Parameters<WhatsAppRepository["resolveSender"]>[0][] = [];
  resolveTemplateInputs: Parameters<WhatsAppRepository["resolveTemplate"]>[0][] = [];
  senderResolver?: WhatsAppRepository["resolveSender"];
  templateResolver?: WhatsAppRepository["resolveTemplate"];

  async resolveSender(input: Parameters<WhatsAppRepository["resolveSender"]>[0]): Promise<ResolvedWhatsAppSender | null> {
    this.resolveSenderInputs.push(input);
    if (this.senderResolver) return this.senderResolver(input);
    return this.sender;
  }

  async resolveTemplate(input: Parameters<WhatsAppRepository["resolveTemplate"]>[0]): Promise<ResolvedWhatsAppTemplate | null> {
    this.resolveTemplateInputs.push(input);
    if (this.templateResolver) return this.templateResolver(input);
    return this.template;
  }

  async createMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessageRecord> {
    this.createdMessages.push(input);
    return { id: `mock-message-${this.createdMessages.length}`, status: "QUEUED" };
  }

  async markSubmitted(input: Parameters<WhatsAppRepository["markSubmitted"]>[0]): Promise<void> {
    this.submittedMessages.push(input);
  }

  async markFailed(input: Parameters<WhatsAppRepository["markFailed"]>[0]): Promise<void> {
    this.failedMessages.push(input);
  }
}
