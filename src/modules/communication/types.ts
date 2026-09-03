import type {
  SendWhatsAppMessageRequest,
  SendWhatsAppMessageResult,
} from "../whatsapp/types";

export type CommunicationRequest = {
  channel: "WHATSAPP";
  message: SendWhatsAppMessageRequest;
};

export type CommunicationResult = SendWhatsAppMessageResult & {
  channel: "WHATSAPP";
};

