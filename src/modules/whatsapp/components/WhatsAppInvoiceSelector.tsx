"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Checkbox, Input, Select, Space, Switch, Typography } from "antd";
import type { WhatsAppInvoiceSelection } from "@/modules/billing/types";

type Options = {
  enabled: boolean;
  sender: { display: string } | null;
  templates: Array<{ id: string; label: string; name: string; language: string; body: string }>;
  defaultTemplateInstanceId: string | null;
  warning: string | null;
};

export function WhatsAppInvoiceSelector({
  storeId,
  recipient,
  value,
  onChange,
}: {
  storeId?: string | null;
  recipient: string;
  value: WhatsAppInvoiceSelection;
  onChange: (value: WhatsAppInvoiceSelection) => void;
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
        onChange({
          ...value,
          enabled: next.enabled ? value.enabled : false,
          recipient: value.recipient || recipient,
          templateInstanceId: value.templateInstanceId || next.defaultTemplateInstanceId || undefined,
        });
      })
      .catch(() => {
        setOptions({ enabled: false, sender: null, templates: [], defaultTemplateInstanceId: null, warning: "WhatsApp invoice settings could not be loaded." });
        onChange({ ...value, enabled: false });
      })
      .finally(() => setLoading(false));
    // The initial default should load only when the Store changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);
  useEffect(() => {
    if (!value.recipient && recipient) onChange({ ...value, recipient });
  }, [recipient, value, onChange]);
  const selected = useMemo(() => options?.templates.find(item => item.id === value.templateInstanceId), [options, value.templateInstanceId]);
  return (
    <div style={{ border: "1px solid #dbe5f0", borderRadius: 14, padding: 14, background: "#f8fbff" }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Typography.Text strong>WhatsApp invoice</Typography.Text>
          <Switch checked={value.enabled} disabled={loading || options?.enabled === false} onChange={enabled => onChange({ ...value, enabled })} />
        </Space>
        {options?.warning ? <Alert type="warning" showIcon message={options.warning} /> : null}
        {value.enabled ? (
          <>
            <Input value={value.recipient || recipient} onChange={event => onChange({ ...value, recipient: event.target.value })} placeholder="Customer WhatsApp number" />
            <Select
              value={value.templateInstanceId}
              onChange={templateInstanceId => onChange({ ...value, templateInstanceId })}
              options={(options?.templates ?? []).map(template => ({ value: template.id, label: `${template.label} (${template.language})` }))}
              placeholder="Invoice template"
              style={{ width: "100%" }}
            />
            <Checkbox checked={value.consentConfirmed === true} onChange={event => onChange({ ...value, consentConfirmed: event.target.checked })}>
              Customer authorized this transactional invoice
            </Checkbox>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Sender: {options?.sender?.display || "Unavailable"}
            </Typography.Text>
            {selected ? <Alert type="info" showIcon message="Message preview" description={selected.body} /> : null}
          </>
        ) : null}
      </Space>
    </div>
  );
}
