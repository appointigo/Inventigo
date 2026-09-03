import { WhatsAppError } from "../errors.ts";
import type { WhatsAppRepository } from "../repositories/WhatsAppRepository";
import type { ActiveWhatsAppSender, WhatsAppSenderPurpose } from "../types";

export class WhatsAppSenderResolver {
  private readonly repository: WhatsAppRepository;

  constructor(repository: WhatsAppRepository) {
    this.repository = repository;
  }

  async resolve(input: {
    organizationId: string;
    storeId?: string;
    purpose: WhatsAppSenderPurpose;
    senderMappingId?: string;
  }): Promise<ActiveWhatsAppSender> {
    const sender = await this.repository.resolveSender(input);
    if (!sender) {
      throw new WhatsAppError(
        "NO_WHATSAPP_SENDER_CONFIGURED",
        "No active WhatsApp sender is configured"
      );
    }
    if (sender.integrationStatus === "ACTION_REQUIRED") {
      throw new WhatsAppError(
        "WHATSAPP_ACTION_REQUIRED",
        "The WhatsApp connection requires action"
      );
    }
    if (sender.integrationStatus !== "CONNECTED" || !sender.credentialRef) {
      throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected");
    }
    if (sender.wabaStatus !== "ACTIVE") {
      throw new WhatsAppError("WABA_NOT_ACTIVE", "The WhatsApp Business Account is not active");
    }
    if (sender.phoneNumberStatus !== "ACTIVE") {
      throw new WhatsAppError("PHONE_NUMBER_NOT_ACTIVE", "The WhatsApp phone number is not active");
    }
    return sender as ActiveWhatsAppSender;
  }
}
