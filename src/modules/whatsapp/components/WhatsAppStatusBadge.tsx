import { Tag } from "antd";
import { WHATSAPP_STATUS_PRESENTATION, type WhatsAppUiState } from "../ui";

export default function WhatsAppStatusBadge({ state }: { state: WhatsAppUiState }) {
  const presentation = WHATSAPP_STATUS_PRESENTATION[state];
  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}

