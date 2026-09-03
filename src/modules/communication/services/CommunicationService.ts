import type { WhatsAppService } from "../../whatsapp/services/WhatsAppService";
import type { CommunicationRequest, CommunicationResult } from "../types";

export class CommunicationService {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  async send(request: CommunicationRequest): Promise<CommunicationResult> {
    const result = await this.whatsAppService.sendMessage(request.message);
    return { channel: "WHATSAPP", ...result };
  }
}

