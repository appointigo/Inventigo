export const WHATSAPP_NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/dashboard/whatsapp/overview", enabled: true },
  { key: "setup", label: "Setup", href: "/dashboard/whatsapp", enabled: true },
  {
    key: "accounts",
    label: "Business Accounts",
    href: "/dashboard/whatsapp/accounts",
    enabled: true,
  },
  {
    key: "numbers",
    label: "Phone Numbers",
    href: "/dashboard/whatsapp/phone-numbers",
    enabled: true,
  },
  {
    key: "mapping",
    label: "Store Mapping",
    href: "/dashboard/whatsapp/store-mapping",
    enabled: true,
  },
  {
    key: "profiles",
    label: "Store Profiles",
    href: "/dashboard/whatsapp/store-profiles",
    enabled: true,
  },
  { key: "templates", label: "Templates", href: "/dashboard/whatsapp/templates", enabled: true },
  { key: "readiness", label: "Readiness", href: "/dashboard/whatsapp/readiness", enabled: true },
  { key: "test", label: "Send Test", href: "/dashboard/whatsapp/test-message", enabled: true },
  { key: "messages", label: "Activity", href: "/dashboard/whatsapp/messages", enabled: true },
  {
    key: "conversations",
    label: "Conversations",
    href: "/dashboard/whatsapp/conversations",
    enabled: true,
  },
  { key: "contacts", label: "Contacts", href: "/dashboard/whatsapp/contacts", enabled: true },
  { key: "campaigns", label: "Campaigns", href: "/dashboard/whatsapp/campaigns", enabled: true },
  {
    key: "automations",
    label: "Automations",
    href: "/dashboard/whatsapp/automations",
    enabled: true,
  },
  { key: "health", label: "Health", href: "/dashboard/whatsapp/health", enabled: true },
] as const;

export type WhatsAppUiState =
  | "NOT_CONNECTED"
  | "PENDING"
  | "CONNECTED"
  | "ACTION_REQUIRED"
  | "SUSPENDED"
  | "DISCONNECTED"
  | "ERROR";

export const WHATSAPP_STATUS_PRESENTATION: Record<
  WhatsAppUiState,
  { label: string; color: "default" | "processing" | "success" | "warning" | "error" }
> = {
  NOT_CONNECTED: { label: "Not connected", color: "default" },
  PENDING: { label: "Setup pending", color: "processing" },
  CONNECTED: { label: "Connected", color: "success" },
  ACTION_REQUIRED: { label: "Action required", color: "warning" },
  SUSPENDED: { label: "Suspended", color: "error" },
  DISCONNECTED: { label: "Disconnected", color: "default" },
  ERROR: { label: "Connection error", color: "error" },
};
