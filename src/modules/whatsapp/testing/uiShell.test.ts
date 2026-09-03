import assert from "node:assert/strict";
import test from "node:test";
import { WHATSAPP_NAV_ITEMS, WHATSAPP_STATUS_PRESENTATION } from "../ui.ts";

test("WhatsApp shell exposes templates, readiness, test send, and activity", () => {
  assert.deepEqual(WHATSAPP_NAV_ITEMS, [
    {
      key: "overview",
      label: "Overview",
      href: "/dashboard/whatsapp/overview",
      enabled: true,
    },
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
    { key: "contacts", label: "Contacts", href: "/dashboard/whatsapp/contacts", enabled: true },
    { key: "campaigns", label: "Campaigns", href: "/dashboard/whatsapp/campaigns", enabled: true },
    {
      key: "automations",
      label: "Automations",
      href: "/dashboard/whatsapp/automations",
      enabled: true,
    },
  ]);
});

test("not-connected and action-required states have explicit labels", () => {
  assert.deepEqual(WHATSAPP_STATUS_PRESENTATION.NOT_CONNECTED, {
    label: "Not connected",
    color: "default",
  });
  assert.equal(WHATSAPP_STATUS_PRESENTATION.ACTION_REQUIRED.label, "Action required");
  assert.equal(WHATSAPP_STATUS_PRESENTATION.ERROR.color, "error");
});
