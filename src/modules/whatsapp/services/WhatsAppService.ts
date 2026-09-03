import type { MetaWhatsAppClient } from "../clients/MetaWhatsAppClient";
import { isWhatsAppError, WhatsAppError } from "../errors.ts";
import type { WhatsAppRepository } from "../repositories/WhatsAppRepository";
import type { SendWhatsAppMessageRequest, SendWhatsAppMessageResult } from "../types";
import { WhatsAppSenderResolver } from "./WhatsAppSenderResolver.ts";
import { WhatsAppTemplateResolver } from "./WhatsAppTemplateResolver.ts";

export class WhatsAppService {
  private readonly repository: WhatsAppRepository;
  private readonly metaClient: MetaWhatsAppClient;
  private readonly senderResolver: WhatsAppSenderResolver;
  private readonly templateResolver: WhatsAppTemplateResolver;

  constructor(repository: WhatsAppRepository, metaClient: MetaWhatsAppClient) {
    this.repository = repository;
    this.metaClient = metaClient;
    this.senderResolver = new WhatsAppSenderResolver(repository);
    this.templateResolver = new WhatsAppTemplateResolver(repository);
  }

  async sendMessage(request: SendWhatsAppMessageRequest): Promise<SendWhatsAppMessageResult> {
    const sender = await this.senderResolver.resolve({
      organizationId: request.organizationId,
      storeId: request.storeId,
      purpose: request.senderPurpose,
      senderMappingId: request.senderMappingId,
    });
    const template =
      request.content.type === "TEMPLATE"
        ? await this.templateResolver.resolve({
            organizationId: request.organizationId,
            wabaId: sender.wabaId,
            template: request.content.template,
          })
        : null;

    const message = await this.repository.createMessage({
      ...request,
      phoneNumberId: sender.phoneNumberId,
      templateInstanceId: template?.templateInstanceId,
    });

    try {
      const result = await this.metaClient.sendMessage({
        organizationId: request.organizationId,
        credentialRef: sender.credentialRef,
        metaPhoneNumberId: sender.metaPhoneNumberId,
        recipient: request.to,
        content: request.content,
        template: template
          ? { metaTemplateName: template.metaTemplateName, language: template.language }
          : undefined,
      });
      await this.repository.markSubmitted({
        messageId: message.id,
        providerMessageId: result.providerMessageId,
        submittedAt: result.acceptedAt,
      });
      return {
        messageId: message.id,
        providerMessageId: result.providerMessageId,
        status: "SUBMITTED",
      };
    } catch (error) {
      const normalized = isWhatsAppError(error)
        ? error
        : new WhatsAppError("META_SEND_FAILED", "Meta rejected or failed to accept the message", {
            cause: error,
            retryable: true,
          });
      await this.repository.markFailed({
        messageId: message.id,
        errorCode: normalized.code,
        errorMessage: normalized.message,
        failedAt: new Date(),
      });
      throw normalized;
    }
  }
}
