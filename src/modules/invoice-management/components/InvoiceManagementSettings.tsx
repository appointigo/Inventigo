"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Select,
  Segmented,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useStoreRecords } from "@/modules/settings/hooks/useStoreRecords";
import type { InvoiceDesignKey, InvoiceManagementSettings } from "../types";
import styles from "./InvoiceManagementSettings.module.css";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type TemplateOption = { id: string; label: string; name: string; language: string; body: string };
type ResponseBody = {
  settings: InvoiceManagementSettings;
  templateOptions: {
    templates: TemplateOption[];
    warning: string | null;
    sender: { display: string } | null;
  };
};

type FormValues = {
  designKey: InvoiceDesignKey;
  defaultWhatsAppEnabled: boolean;
  termsText: string | null;
  exchangePolicyText: string | null;
  returnPolicyText: string | null;
  thankYouMessage: string | null;
  storeSubtitle: string | null;
  footerNote: string | null;
  signatureText: string | null;
  qrHelperText: string | null;
  effectiveFrom?: ReturnType<typeof dayjs> | null;
  saleTemplateInstanceId: string | null;
  exchangeTemplateInstanceId: string | null;
};

const designs: Array<{ key: InvoiceDesignKey; name: string; description: string }> = [
  { key: "CLASSIC", name: "Classic", description: "Balanced and familiar for everyday tax invoices." },
  { key: "PREMIUM", name: "Premium", description: "Refined navy and gold treatment for elevated retail." },
  { key: "COMPACT", name: "Compact", description: "Denser layout for shorter printouts and item-heavy bills." },
];

const blueprints = [
  { name: "Invoice ready", body: "Hi {{customer_name}}, invoice {{invoice_number}} dated {{invoice_date}} is attached." },
  { name: "Thank you", body: "Thank you, {{customer_name}}. Your invoice {{invoice_number}} from {{invoice_date}} is attached." },
  { name: "Exchange receipt", body: "Hi {{customer_name}}, your exchange receipt {{invoice_number}} dated {{invoice_date}} is attached." },
];

function SyntheticInvoice({
  design,
  documentType,
  termsText,
  returnPolicyText,
  thankYouMessage,
}: {
  design: InvoiceDesignKey;
  documentType: "SALE" | "EXCHANGE" | "RETURN";
  termsText?: string | null;
  returnPolicyText?: string | null;
  thankYouMessage?: string | null;
}) {
  return (
    <div className={`${styles.preview} ${styles[design.toLowerCase()]}`}>
      <div className={styles.previewHeader}>
        <strong>Stockiva Store</strong>
        <span>{documentType === "SALE" ? "Tax Invoice" : documentType === "EXCHANGE" ? "Exchange Receipt" : "Return Receipt"}</span>
      </div>
      <div className={styles.previewMeta}>
        <span>INV-20260925-0001</span>
        <span>25 Sep 2026</span>
      </div>
      <div className={styles.previewRow}><span>{documentType === "EXCHANGE" ? "Returned · Classic Shirt × 1" : "Classic Shirt × 1"}</span><strong>₹1,250.00</strong></div>
      {documentType !== "RETURN" ? <div className={styles.previewRow}><span>{documentType === "EXCHANGE" ? "Replacement · Linen Trousers × 1" : "Linen Trousers × 1"}</span><strong>₹1,800.00</strong></div> : null}
      <div className={styles.previewTotal}><span>{documentType === "RETURN" ? "Refund" : documentType === "EXCHANGE" ? "Settlement" : "Total"}</span><strong>{documentType === "RETURN" ? "₹1,250.00" : "₹3,050.00"}</strong></div>
      {termsText || returnPolicyText ? <div className={styles.previewPolicy}>
        {termsText ? <span><strong>Terms:</strong> {termsText}</span> : null}
        {returnPolicyText ? <span><strong>Returns:</strong> {returnPolicyText}</span> : null}
      </div> : null}
      <small>{thankYouMessage || "Thank you for shopping with us."}</small>
    </div>
  );
}

export default function InvoiceManagementSettings() {
  const { message } = App.useApp();
  const { stores, loading: storesLoading } = useStoreRecords();
  const [form] = Form.useForm<FormValues>();
  const [storeId, setStoreId] = useState<string>();
  const [data, setData] = useState<ResponseBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewKind, setPreviewKind] = useState<"SALE" | "EXCHANGE" | "RETURN">("SALE");
  const selectedDesign = Form.useWatch("designKey", form) ?? "CLASSIC";
  const termsText = Form.useWatch("termsText", form);
  const returnPolicyText = Form.useWatch("returnPolicyText", form);
  const thankYouMessage = Form.useWatch("thankYouMessage", form);

  useEffect(() => setStoreId(current => current ?? stores[0]?.id), [stores]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoice-management?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Invoice settings could not be loaded");
      const next = body as ResponseBody;
      setData(next);
      form.setFieldsValue({
        designKey: next.settings.designKey,
        defaultWhatsAppEnabled: next.settings.defaultWhatsAppEnabled,
        termsText: next.settings.policy.termsText,
        exchangePolicyText: next.settings.policy.exchangePolicyText,
        returnPolicyText: next.settings.policy.returnPolicyText,
        thankYouMessage: next.settings.policy.thankYouMessage,
        storeSubtitle: next.settings.policy.storeSubtitle,
        footerNote: next.settings.policy.footerNote,
        signatureText: next.settings.policy.signatureText,
        qrHelperText: next.settings.policy.qrHelperText,
        effectiveFrom: next.settings.policy.effectiveFrom ? dayjs(next.settings.policy.effectiveFrom) : dayjs(),
        saleTemplateInstanceId: next.settings.saleTemplateInstanceId,
        exchangeTemplateInstanceId: next.settings.exchangeTemplateInstanceId,
      });
    } catch (error) {
      setData(null);
      message.error(error instanceof Error ? error.message : "Invoice settings could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [form, message, storeId]);

  useEffect(() => { void load(); }, [load]);

  const templateOptions = useMemo(() => (data?.templateOptions.templates ?? []).map(template => ({
    value: template.id,
    label: `${template.label} (${template.language})`,
  })), [data]);

  const save = async (values: Partial<FormValues>) => {
    if (!storeId) return;
    setSaving(true);
    try {
      const { effectiveFrom, ...suppliedValues } = values;
      const payload = {
        ...suppliedValues,
        ...(effectiveFrom !== undefined && effectiveFrom !== null
          ? { effectiveFrom: effectiveFrom.toISOString() }
          : {}),
      };
      const response = await fetch(`/api/invoice-management?storeId=${encodeURIComponent(storeId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Invoice settings could not be saved");
      message.success("Invoice settings saved");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Invoice settings could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (storesLoading) return <Spin />;
  if (!stores.length) return <Empty description="No stores available" />;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>Invoice Management</Typography.Title>
        <Paragraph type="secondary">Configure invoice presentation, store policies and transactional delivery defaults.</Paragraph>
      </div>
      <Select value={storeId} onChange={setStoreId} options={stores.map(store => ({ value: store.id, label: `${store.name} (${store.code})` }))} style={{ width: "100%", maxWidth: 420 }} />
      {loading || !data ? <Spin /> : (
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ designKey: "CLASSIC", defaultWhatsAppEnabled: false }}>
          <Tabs items={[
            {
              key: "designs",
              label: "Invoice Designs",
              children: <div className={styles.designGrid}>
                <div className={styles.designChoices}>{designs.map(design => <Card key={design.key} size="small" className={selectedDesign === design.key ? styles.selectedCard : undefined} onClick={() => form.setFieldValue("designKey", design.key)} hoverable><Space direction="vertical" size={2}><Space><strong>{design.name}</strong>{selectedDesign === design.key ? <Tag color="blue">Default</Tag> : null}</Space><Text type="secondary">{design.description}</Text></Space></Card>)}</div>
                <div><Segmented block value={previewKind} onChange={value => setPreviewKind(value as typeof previewKind)} options={[{ label: "Sale", value: "SALE" }, { label: "Exchange", value: "EXCHANGE" }, { label: "Return", value: "RETURN" }]} style={{ marginBottom: 12 }} /><SyntheticInvoice design={selectedDesign} documentType={previewKind} termsText={termsText} returnPolicyText={returnPolicyText} thankYouMessage={thankYouMessage} /></div>
                <Form.Item name="designKey" hidden><Input /></Form.Item>
              </div>,
            },
            {
              key: "terms",
              label: "Terms & Conditions",
              children: <Card><Alert type="info" showIcon message={`Policy version ${data.settings.policy.version ?? "new"}`} description="Saving changed content creates a new immutable version. Existing documents keep their original snapshot." style={{ marginBottom: 18 }} /><Form.Item name="storeSubtitle" label="Store subtitle / tagline"><Input /></Form.Item><Form.Item name="termsText" label="Sale terms & conditions"><TextArea rows={4} /></Form.Item><Form.Item name="exchangePolicyText" label="Exchange policy"><TextArea rows={4} /></Form.Item><Form.Item name="returnPolicyText" label="Return policy"><TextArea rows={4} /></Form.Item><Form.Item name="thankYouMessage" label="Thank-you message"><Input /></Form.Item><Form.Item name="signatureText" label="Signature / sign-off text"><Input /></Form.Item><Form.Item name="qrHelperText" label="QR / online-view helper text"><Input /></Form.Item><Form.Item name="footerNote" label="Footer note"><Input /></Form.Item><Form.Item name="effectiveFrom" label="Effective from"><DatePicker showTime style={{ width: "100%" }} /></Form.Item></Card>,
            },
            {
              key: "templates",
              label: "WhatsApp Templates",
              children: <Space direction="vertical" size="large" style={{ width: "100%" }}>{data.templateOptions.warning ? <Alert type="warning" showIcon message={data.templateOptions.warning} /> : null}<Card><Form.Item name="saleTemplateInstanceId" label="Default sale invoice template"><Select allowClear options={templateOptions} placeholder="Choose an approved document template" /></Form.Item><Form.Item name="exchangeTemplateInstanceId" label="Default exchange / return template"><Select allowClear options={templateOptions} placeholder="Choose an approved document template" /></Form.Item><Text type="secondary">Sender: {data.templateOptions.sender?.display || "Unavailable"}</Text></Card><div className={styles.blueprintGrid}>{blueprints.map(blueprint => <Card key={blueprint.name} size="small" title={blueprint.name}><Paragraph>{blueprint.body}</Paragraph><Button href="/dashboard/whatsapp/templates">Open template approval workflow</Button></Card>)}</div></Space>,
            },
            {
              key: "delivery",
              label: "Delivery Preferences",
              children: <Card><Form.Item name="defaultWhatsAppEnabled" label="WhatsApp invoice by default" valuePropName="checked"><Switch /></Form.Item><Alert type="info" showIcon message="Cashiers can still turn delivery off for an individual transaction." description="The customer number is used only for the transactional invoice. Marketing consent remains separate." /></Card>,
            },
          ]} />
          <Button type="primary" htmlType="submit" loading={saving}>Save invoice settings</Button>
        </Form>
      )}
    </Space>
  );
}
