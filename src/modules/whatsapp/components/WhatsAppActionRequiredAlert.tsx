import { Alert } from "antd";

export default function WhatsAppActionRequiredAlert({ message }: { message?: string }) {
  return (
    <Alert
      type="warning"
      showIcon
      title="Your WhatsApp connection needs attention"
      description={message ?? "Review your Meta business account before sending messages."}
    />
  );
}
