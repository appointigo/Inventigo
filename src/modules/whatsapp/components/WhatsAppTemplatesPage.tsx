"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SyncOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, App, Button, Descriptions, Drawer, Empty, Form, Input, Modal, Popconfirm, Radio, Segmented, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
import { logWhatsAppApiFailure, readWhatsAppApiJson } from "../embeddedSignupClient";
import { extractTemplateVariablePositions, META_TEMPLATE_NAME_PATTERN, normalizeMetaTemplateName, renderTemplatePreview } from "../templateCreationSchemas";
const { Title, Text, Paragraph } = Typography;
type Template = { id: string; metaTemplateId?: string | null; metaTemplateName: string; status: string; rejectionReason: string | null; submittedAt?: string | null; approvedAt?: string | null; rejectedAt?: string | null; lastSyncedAt: string | null; definition: { key: string; version: number; language: string; purpose: string; category: string; source: "SYSTEM" | "MERCHANT" | "META_IMPORTED"; displayLabel: string | null; body: string; footer: string | null; header?: unknown; buttons?: unknown; variables?: unknown; _count: { campaigns: number; automations: number } }; waba: { metaWabaId: string; businessName: string | null } };
const color = (status: string) => status === "APPROVED" ? "green" : status === "REJECTED" || status === "DISABLED" ? "red" : status === "PAUSED" ? "orange" : "blue";
const sourceLabel = { SYSTEM: "Stockiva", MERCHANT: "Merchant", META_IMPORTED: "Imported from Meta" } as const;
type TemplateFilter = "All" | "System" | "Marketing" | "Utility" | "Approved" | "Pending" | "Rejected";
type TemplateVariable = { position: number; key: string; example: string };
type CreationBlueprint = { id: string; key: string; displayLabel: string; description: string; version: number; language: "en_US"; category: "MARKETING"; purpose: "MARKETING_PROMOTION" | "PRODUCT_LAUNCH" | "COUPON" | "CUSTOM"; body: string; footer: string | null; variables: TemplateVariable[]; namePattern: string };
type CreationOptions = { allowed: true; wabas: Array<{ id: string; businessName: string | null }>; blueprints: CreationBlueprint[] } | { allowed: false; code: "WABA_NOT_CONNECTED"; message: string; wabas: [] };
type CreateTemplateValues = { wabaId: string; displayLabel: string; metaTemplateName: string; language: "en_US"; category: "MARKETING"; purpose: CreationBlueprint["purpose"]; body: string; footer?: string; variables: TemplateVariable[] };

export default function WhatsAppTemplatesPage() {
  const { message } = App.useApp();
  const [createForm] = Form.useForm<CreateTemplateValues>();
  const [rows, setRows] = useState<Template[]>([]); const [selected, setSelected] = useState<Template>();
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<TemplateFilter>("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [creationOptions, setCreationOptions] = useState<CreationOptions>();
  const [checkingCreation, setCheckingCreation] = useState(false);
  const [creationMode, setCreationMode] = useState<string>();
  const [creationPreview, setCreationPreview] = useState<CreateTemplateValues>();
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const selectedBlueprint = creationOptions?.allowed ? creationOptions.blueprints.find(blueprint => blueprint.id === creationMode) : undefined;
  useEffect(() => {
    if (!creationOptions?.allowed || !creationMode) return;
    const waba = creationOptions.wabas[0];
    if (!waba) return;
    if (selectedBlueprint) {
      createForm.setFieldsValue({
        wabaId: waba.id,
        displayLabel: selectedBlueprint.displayLabel,
        metaTemplateName: normalizeMetaTemplateName(`${waba.businessName || "merchant"}_${selectedBlueprint.key}_en_us`),
        language: selectedBlueprint.language,
        category: "MARKETING",
        purpose: selectedBlueprint.purpose,
        body: selectedBlueprint.body,
        footer: selectedBlueprint.footer ?? undefined,
        variables: selectedBlueprint.variables.map(variable => ({ ...variable })),
      });
    } else {
      createForm.setFieldsValue({
        wabaId: waba.id,
        displayLabel: "",
        metaTemplateName: "",
        language: "en_US",
        category: "MARKETING",
        purpose: "CUSTOM",
        body: "",
        footer: undefined,
        variables: [],
      });
    }
  }, [createForm, creationMode, creationOptions, selectedBlueprint]);
  const creationBody = Form.useWatch("body", createForm) ?? "";
  const variablePositions = useMemo(
    () => extractTemplateVariablePositions(creationBody),
    [creationBody]
  );
  useEffect(() => {
    if (!creationMode) return;
    const current = (createForm.getFieldValue("variables") ?? []) as TemplateVariable[];
    createForm.setFieldValue("variables", variablePositions.map(position =>
      current.find(variable => variable.position === position) ?? {
        position,
        key: position === 1 ? "customerName" : `variable${position}`,
        example: "",
      }
    ));
  }, [createForm, creationMode, variablePositions]);
  const load = useCallback(async () => { setLoading(true); setError(false); try { const r = await fetch("/api/whatsapp/templates", { cache: "no-store" }); if (!r.ok) throw new Error(); setRows(await r.json() as Template[]); } catch { setError(true); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const detail = async (id: string) => { try { const r = await fetch(`/api/whatsapp/templates/${id}`, { cache: "no-store" }); if (!r.ok) throw new Error(); setSelected(await r.json() as Template); } catch { message.error("Unable to load template details"); } };
  const beginCreate = async () => {
    setCheckingCreation(true);
    try {
      const response = await fetch("/api/whatsapp/templates/creation-options", { cache: "no-store" });
      const options = await response.json() as CreationOptions & { error?: string };
      if (!response.ok) throw new Error(options.error || "Template creation is unavailable");
      if (!options.allowed) {
        message.warning(options.message);
        return;
      }
      setCreationOptions(options);
      setCreationMode(undefined);
      setCreationPreview(undefined);
      setCreateOpen(true);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Template creation is unavailable");
    } finally {
      setCheckingCreation(false);
    }
  };
  const submitTemplate = async () => {
    if (!creationPreview) return;
    setSubmittingTemplate(true);
    try {
      const response = await fetch("/api/whatsapp/templates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...creationPreview,
          ...(creationMode && creationMode !== "custom_marketing"
            ? { blueprintId: creationMode }
            : {}),
        }),
      });
      const result = await readWhatsAppApiJson<{
        error?: string;
        code?: string;
        requestId?: string;
        diagnostic?: Record<string, unknown>;
        template?: { status?: string };
      }>(response);
      if (!response.ok) {
        logWhatsAppApiFailure("template_create_failed", result);
        throw new Error(result.error || "Template could not be submitted to Meta");
      }
      message.success(`Template submitted to Meta with status ${result.template?.status ?? "PENDING"}`);
      setCreateOpen(false);
      setCreationPreview(undefined);
      createForm.resetFields();
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Template could not be submitted to Meta");
    } finally {
      setSubmittingTemplate(false);
    }
  };
  const removeFromStockiva = async (template: Template) => {
    const response = await fetch(`/api/whatsapp/templates/${template.id}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      message.error(result.error || "Template could not be removed");
      return;
    }
    message.success("Template removed from Stockiva. The Meta template was not deleted.");
    setSelected(undefined);
    await load();
  };
  const reconcile = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/whatsapp/templates", { method: "POST" });
      if (!response.ok) {
        const failure = await readWhatsAppApiJson<{
          error?: string;
          code?: string;
          requestId?: string;
          diagnostic?: Record<string, unknown>;
        }>(response);
        logWhatsAppApiFailure("template_sync_failed", failure);
        throw new Error("Unable to synchronize with Meta.");
      }
      message.success("Templates reconciled with Meta");
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Unable to synchronize with Meta.");
    } finally {
      setSyncing(false);
    }
  };
  const rejected = rows.filter(row => row.status === "REJECTED" || row.status === "DISABLED");
  const filteredRows = useMemo(() => rows.filter(row => {
    if (filter === "System") return row.definition.source === "SYSTEM";
    if (filter === "Marketing") return row.definition.category === "MARKETING";
    if (filter === "Utility") return row.definition.category === "UTILITY";
    if (filter === "Approved") return row.status === "APPROVED";
    if (filter === "Pending") return row.status === "PENDING";
    if (filter === "Rejected") return row.status === "REJECTED";
    return true;
  }), [filter, rows]);
  const columns: ColumnsType<Template> = [
    { title: "Template", render: (_, r) => <><Text strong>{r.definition.displayLabel || r.metaTemplateName}</Text><br/><Text type="secondary">{r.metaTemplateName} · v{r.definition.version}</Text></> },
    { title: "Category", render: (_, r) => <Tag color={r.definition.category === "MARKETING" ? "magenta" : "blue"}>{r.definition.category}</Tag> },
    { title: "Purpose", render: (_, r) => <Tag>{r.definition.purpose}</Tag> },
    { title: "Source", render: (_, r) => sourceLabel[r.definition.source] },
    { title: "Language", render: (_, r) => r.definition.language },
    { title: "WABA", render: (_, r) => r.waba.businessName || r.waba.metaWabaId },
    { title: "Meta Status", dataIndex: "status", render: v => <Tag color={color(v)}>{v}</Tag> },
    { title: "Used By", render: (_, r) => r.definition._count.campaigns || r.definition._count.automations ? `${r.definition._count.campaigns} campaign(s), ${r.definition._count.automations} automation(s)` : "Not used" },
    { title: "Actions", render: (_, r) => <Button icon={<EyeOutlined/>} onClick={() => void detail(r.id)}>Details</Button> },
  ];
  return <WhatsAppShell activeKey="templates" status={<WhatsAppStatusBadge state={rows.some(r => r.status === "APPROVED") ? "CONNECTED" : "PENDING"}/>}>
    {rejected.length > 0 && <Alert type="error" showIcon icon={<WarningOutlined/>} message="Template action required" description={`${rejected.length} template(s) were rejected or disabled by Meta. Open details for the provider reason, then correct the definition before submitting a new version.`}/>}
    <Surface><Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}><div><Title level={3} style={{ margin: 0 }}>Message Templates</Title><Text type="secondary">WABA-specific template approval and synchronization state.</Text></div><Space><Button icon={<PlusOutlined/>} loading={checkingCreation} onClick={() => void beginCreate()}>Create Template</Button><Button type="primary" icon={<SyncOutlined/>} loading={syncing} onClick={() => void reconcile()}>Reconcile with Meta</Button></Space></Space>
      <Segmented<TemplateFilter> style={{ marginBottom: 18 }} value={filter} onChange={setFilter} options={["All", "System", "Marketing", "Utility", "Approved", "Pending", "Rejected"]}/>
      {error ? <Alert type="error" showIcon message="Templates could not be loaded" action={<Button icon={<ReloadOutlined/>} onClick={() => void load()}>Retry</Button>}/> : <Table rowKey="id" loading={loading} dataSource={filteredRows} columns={columns} pagination={false} scroll={{ x: 1100 }} locale={{ emptyText: <Empty description="No templates match this filter"/> }}/>}</Surface>
    <Drawer width={640} title="Template Detail" open={Boolean(selected)} onClose={() => setSelected(undefined)}>{selected && <><Descriptions bordered size="small" column={1} items={[{ key:"label", label:"Stockiva label", children:selected.definition.displayLabel || selected.metaTemplateName },{ key:"name", label:"Meta template name", children:selected.metaTemplateName },{ key:"metaId", label:"Meta template ID", children:selected.metaTemplateId || "Not assigned" },{ key:"waba", label:"WABA", children:selected.waba.businessName || selected.waba.metaWabaId },{ key:"source", label:"Source", children:sourceLabel[selected.definition.source] },{ key:"category", label:"Category", children:selected.definition.category },{ key:"purpose", label:"Purpose", children:selected.definition.purpose },{ key:"language", label:"Language", children:selected.definition.language },{ key:"version", label:"Version", children:selected.definition.version },{ key:"status", label:"Meta status", children:<Tag color={color(selected.status)}>{selected.status}</Tag> },{ key:"sync", label:"Last reconciled", children:selected.lastSyncedAt ? new Date(selected.lastSyncedAt).toLocaleString() : "Never" },{ key:"used", label:"Used by", children:`${selected.definition._count.campaigns} campaign(s), ${selected.definition._count.automations} automation(s)` }]}/><Alert style={{ marginTop: 16 }} type="info" showIcon message={selected.definition.source === "SYSTEM" ? "Stockiva system template" : selected.status === "APPROVED" ? "Approved templates are versioned" : selected.status === "PENDING" ? "Template is under Meta review" : selected.status === "REJECTED" ? "Create a revised version" : "Template editing is unavailable"} description={selected.definition.source === "SYSTEM" ? "Core system definitions are read-only for merchants." : selected.status === "APPROVED" ? "Create a new version instead of changing the approved Meta template in place." : selected.status === "PENDING" ? "Reconcile after Meta completes its review. This version cannot be edited in place." : selected.status === "REJECTED" ? "Use this content as the basis for a new corrected template submission." : "Meta lifecycle rules do not permit an in-place edit for this state."}/>{selected.rejectionReason && <Alert style={{ marginTop: 16 }} type="error" showIcon message="Meta rejected this template" description={selected.rejectionReason}/>}<Title level={5} style={{ marginTop: 20 }}>Template content</Title>{selected.definition.header != null && <Paragraph><Text strong>Header: </Text>{JSON.stringify(selected.definition.header)}</Paragraph>}<Paragraph copyable style={{ whiteSpace: "pre-wrap" }}>{selected.definition.body || "Body content was not returned by Meta."}</Paragraph>{selected.definition.footer && <Paragraph type="secondary">Footer: {selected.definition.footer}</Paragraph>}{selected.definition.variables != null && <Paragraph><Text strong>Variables: </Text>{JSON.stringify(selected.definition.variables)}</Paragraph>}{selected.definition.buttons != null && <Paragraph><Text strong>Buttons: </Text>{JSON.stringify(selected.definition.buttons)}</Paragraph>}{selected.definition.source === "MERCHANT" && <><Alert style={{ marginTop: 20 }} type="warning" showIcon message="Remove from Stockiva only" description="This action does not delete the template from Meta. A later reconciliation may import it again."/><Popconfirm title="Remove this template from Stockiva?" description="The Meta template will remain unchanged." onConfirm={() => void removeFromStockiva(selected)}><Button danger icon={<DeleteOutlined/>} style={{ marginTop: 12 }}>Remove from Stockiva</Button></Popconfirm></>}</>}</Drawer>
    <Modal title="Create Message Template" open={createOpen} footer={null} onCancel={() => setCreateOpen(false)} destroyOnHidden width={720}>{creationPreview ? <><Descriptions bordered size="small" column={1} items={[{ key: "name", label: "Template name", children: creationPreview.metaTemplateName }, { key: "category", label: "Category", children: creationPreview.category }, { key: "language", label: "Language", children: creationPreview.language }, { key: "purpose", label: "Purpose", children: creationPreview.purpose }]}/><Title level={5} style={{ marginTop: 20 }}>Message preview</Title><Paragraph style={{ whiteSpace: "pre-wrap" }}>{renderTemplatePreview(creationPreview.body, creationPreview.variables)}</Paragraph>{creationPreview.footer && <Text type="secondary">{creationPreview.footer}</Text>}<Space style={{ marginTop: 24 }}><Button onClick={() => setCreationPreview(undefined)}>Back to edit</Button><Button type="primary" loading={submittingTemplate} onClick={() => void submitTemplate()}>Submit to Meta</Button></Space></> : <><Paragraph type="secondary">Create a marketing template for {creationOptions?.allowed ? creationOptions.wabas[0]?.businessName || "your connected WABA" : "your connected WABA"}.</Paragraph><Text strong>Choose template type</Text><Radio.Group style={{ display: "block", marginTop: 12 }} value={creationMode} onChange={event => { setCreationMode(event.target.value as string); setCreationPreview(undefined); }}><Space direction="vertical" style={{ width: "100%" }}>{creationOptions?.allowed && creationOptions.blueprints.map(blueprint => <Radio key={blueprint.id} value={blueprint.id}><Text strong>{blueprint.displayLabel}</Text><br/><Text type="secondary">{blueprint.description}</Text></Radio>)}<Radio value="custom_marketing"><Text strong>Custom Marketing</Text><br/><Text type="secondary">Start with a blank marketing message.</Text></Radio></Space></Radio.Group>{creationMode && creationOptions?.allowed && <Form form={createForm} layout="vertical" style={{ marginTop: 24 }} onFinish={values => setCreationPreview(values)}><Form.Item name="wabaId" label="WhatsApp Business Account" rules={[{ required: true }]}><Select options={creationOptions.wabas.map(waba => ({ value: waba.id, label: waba.businessName || "WhatsApp Business Account" }))}/></Form.Item><Form.Item name="displayLabel" label="Template display label" rules={[{ required: true }, { max: 120 }]}><Input onBlur={event => { if (!createForm.getFieldValue("metaTemplateName")) createForm.setFieldValue("metaTemplateName", normalizeMetaTemplateName(event.target.value)); }}/></Form.Item><Form.Item name="metaTemplateName" label="Meta template name" extra="Lowercase letters, numbers, and underscores only." rules={[{ required: true }, { pattern: META_TEMPLATE_NAME_PATTERN, message: "Use lowercase letters, numbers, and single underscores only" }, { max: 512 }]} normalize={value => typeof value === "string" ? normalizeMetaTemplateName(value) : value}><Input/></Form.Item><Space size="large" align="start"><Form.Item name="language" label="Language" rules={[{ required: true }]}><Select style={{ width: 160 }} options={[{ value: "en_US", label: "English (US)" }]}/></Form.Item><Form.Item name="category" label="Category"><Input readOnly/></Form.Item><Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}><Select style={{ width: 220 }} options={["MARKETING_PROMOTION", "PRODUCT_LAUNCH", "COUPON", "CUSTOM"].map(value => ({ value, label: value.replaceAll("_", " ") }))}/></Form.Item></Space><Form.Item name="body" label="Message body" extra="Use sequential placeholders such as {{1}}, {{2}}." rules={[{ required: true }, { max: 1024 }]}><Input.TextArea rows={5} showCount maxLength={1024}/></Form.Item>{variablePositions.length > 0 && <><Text strong>Variables</Text><Form.List name="variables">{fields => <>{fields.map((field, index) => <Space key={field.key} align="start" style={{ display: "flex", marginTop: 12 }}><Form.Item name={[field.name, "position"]} initialValue={variablePositions[index]} hidden><Input/></Form.Item><Text style={{ paddingTop: 6 }}>{`{{${variablePositions[index]}}}`}</Text><Form.Item name={[field.name, "key"]} rules={[{ required: true }, { pattern: /^[A-Za-z][A-Za-z0-9]*$/, message: "Use a semantic key such as customerName" }]}><Input placeholder="Semantic key"/></Form.Item><Form.Item name={[field.name, "example"]} rules={[{ required: true }]}><Input placeholder="Sample value"/></Form.Item></Space>)}</>}</Form.List></>}<Form.Item name="footer" label="Footer (optional)" rules={[{ max: 60 }]}><Input showCount maxLength={60}/></Form.Item><Button type="primary" htmlType="submit">Preview template</Button></Form>}</>}</Modal>
  </WhatsAppShell>;
}
