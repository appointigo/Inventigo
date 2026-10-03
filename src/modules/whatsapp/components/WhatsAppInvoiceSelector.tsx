"use client";

import { useEffect, useState } from "react";
import { Alert, Input, Space, Switch, Typography } from "antd";
import type { WhatsAppInvoiceSelection } from "@/modules/billing/types";

type Options = {
  enabled: boolean;
  sender: { display: string } | null;
  templates: Array<{ id: string; label: string; name: string; language: string; body: string }>;
  defaultTemplateInstanceId: string | null;
  defaultExchangeTemplateInstanceId: string | null;
  defaultWhatsAppEnabled: boolean;
  warning: string | null;
};

export function WhatsAppInvoiceSelector({
  storeId,
  recipient,
  value,
  onChange,
  transactionKind = "SALE",
}: {
  storeId?: string | null;
  recipient: string;
  value: WhatsAppInvoiceSelection;
  onChange: (value: WhatsAppInvoiceSelection) => void;
  transactionKind?: "SALE" | "EXCHANGE";
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!storeId) return;
    const requestId = crypto.randomUUID();
    setLoading(true);
    fetch(`/api/whatsapp/invoices/options?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store", headers: { "x-request-id": requestId } })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((next: Options) => {
        setOptions(next);
        const defaultTemplateInstanceId = transactionKind === "EXCHANGE"
          ? next.defaultExchangeTemplateInstanceId
          : next.defaultTemplateInstanceId;
        onChange({
          enabled: next.enabled && Boolean(defaultTemplateInstanceId) && next.defaultWhatsAppEnabled,
          recipient: value.recipient || recipient,
          consentConfirmed: next.enabled && Boolean(defaultTemplateInstanceId) && next.defaultWhatsAppEnabled,
        });
      })
      .catch(() => {
        setOptions({ enabled: false, sender: null, templates: [], defaultTemplateInstanceId: null, defaultExchangeTemplateInstanceId: null, defaultWhatsAppEnabled: false, warning: "WhatsApp invoice settings could not be loaded." });
        onChange({ ...value, enabled: false });
      })
      .finally(() => setLoading(false));
    // The initial default should load when the Store or transaction type changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, transactionKind]);
  useEffect(() => {
    if (!value.recipient && recipient) onChange({ ...value, recipient });
  }, [recipient, value, onChange]);
  const configuredTemplateId = transactionKind === "EXCHANGE"
    ? options?.defaultExchangeTemplateInstanceId
    : options?.defaultTemplateInstanceId;
  const deliveryAvailable = options?.enabled === true && Boolean(configuredTemplateId);
  return (
    <div style={{ border: "1px solid #dbe5f0", borderRadius: 14, padding: 14, background: "#f8fbff" }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Typography.Text strong>WhatsApp invoice</Typography.Text>
          <Switch checked={value.enabled} disabled={loading || !deliveryAvailable} onChange={enabled => onChange({ ...value, enabled, consentConfirmed: enabled || undefined })} />
        </Space>
        {options?.warning ? <Alert type="warning" showIcon message={options.warning} /> : null}
        {options && options.enabled && !configuredTemplateId ? (
          <Alert
            type="warning"
            showIcon
            message={`No default ${transactionKind === "EXCHANGE" ? "exchange" : "sale"} invoice template is configured for this Store.`}
          />
        ) : null}
        {value.enabled ? (
          <>
            <Input value={value.recipient || recipient} onChange={event => onChange({ ...value, recipient: event.target.value.replace(/(?!^\+)\D/g, "").slice(0, 16) })} placeholder="Customer WhatsApp number, including country code" />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              This number will be used only to deliver this transactional invoice. Sender: {options?.sender?.display || "Unavailable"}
            </Typography.Text>
          </>
        ) : null}
      </Space>
    </div>
  );
}
