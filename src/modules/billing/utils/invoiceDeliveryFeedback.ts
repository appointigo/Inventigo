import type { InvoiceDeliveryState } from "../types";

export type InvoiceDeliveryFeedback = {
  level: "success" | "info" | "warning";
  text: string;
};

export function getInvoiceDeliveryFeedback(
  subject: string,
  delivery?: InvoiceDeliveryState
): InvoiceDeliveryFeedback {
  if (!delivery) return { level: "success", text: `${subject} completed.` };

  switch (delivery.status) {
    case "FAILED":
      return {
        level: "warning",
        text: `${subject} completed, but WhatsApp invoice processing failed. You can review or resend it from Bill History.`,
      };
    case "DELIVERED":
    case "READ":
      return {
        level: "success",
        text: `${subject} completed and the WhatsApp invoice was delivered.`,
      };
    case "SENT":
      return {
        level: "info",
        text: `${subject} completed. Meta sent the WhatsApp invoice; delivery is still pending.`,
      };
    case "SUBMITTED":
      return {
        level: "info",
        text: `${subject} completed. The WhatsApp invoice was submitted to Meta; delivery is still pending.`,
      };
    case "QUEUED":
    default:
      return {
        level: "info",
        text: `${subject} completed. The WhatsApp invoice is processing.`,
      };
  }
}
