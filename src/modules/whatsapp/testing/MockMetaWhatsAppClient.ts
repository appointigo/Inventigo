import type {
  MetaCodeExchangeResult,
  MetaCreateTemplateRequest,
  MetaMessageTemplate,
  MetaPhoneNumber,
  MetaSendMessageRequest,
  MetaSendMessageResult,
  MetaTokenInspection,
  MetaWaba,
  MetaWhatsAppClient,
} from "../clients/MetaWhatsAppClient";

export class MockMetaWhatsAppClient implements MetaWhatsAppClient {
  readonly requests: MetaSendMessageRequest[] = [];
  readonly templateCreateRequests: MetaCreateTemplateRequest[] = [];
  templates: MetaMessageTemplate[] = [];
  result: MetaSendMessageResult = {
    providerMessageId: "mock-message-id",
    acceptedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  error: unknown;

  async sendMessage(request: MetaSendMessageRequest): Promise<MetaSendMessageResult> {
    this.requests.push(request);
    if (this.error) throw this.error;
    return this.result;
  }

  async exchangeEmbeddedSignupCode(): Promise<MetaCodeExchangeResult> { return { accessToken: "mock-token" }; }
  async inspectToken(): Promise<MetaTokenInspection> { return { appId: "mock-app", isValid: true, scopes: ["whatsapp_business_management", "whatsapp_business_messaging"], granularScopes: [] }; }
  async getWaba(id: string): Promise<MetaWaba> { return { id }; }
  async listPhoneNumbers(): Promise<MetaPhoneNumber[]> { return []; }
  async registerPhoneNumber(): Promise<void> {}
  async subscribeApp(): Promise<void> {}
  async listMessageTemplates(): Promise<MetaMessageTemplate[]> { return this.templates; }
  async createMessageTemplate(input: MetaCreateTemplateRequest): Promise<MetaMessageTemplate> {
    this.templateCreateRequests.push(input);
    const created = { id: `meta-template-${this.templateCreateRequests.length}`, name: input.name, language: input.language, category: input.category, status: "PENDING" as const };
    return created;
  }
}
