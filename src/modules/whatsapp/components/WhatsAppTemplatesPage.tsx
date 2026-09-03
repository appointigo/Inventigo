"use client";
import { useCallback, useEffect, useState } from "react";
import { EyeOutlined, ReloadOutlined, SyncOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, App, Button, Descriptions, Drawer, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text, Paragraph } = Typography;
type Template = { id: string; metaTemplateId?: string | null; metaTemplateName: string; status: string; rejectionReason: string | null; lastSyncedAt: string | null; definition: { key: string; version: number; language: string; purpose: string; category: string; body: string; footer: string | null }; waba: { metaWabaId: string; businessName: string | null } };
const color = (status: string) => status === "APPROVED" ? "green" : status === "REJECTED" || status === "DISABLED" ? "red" : status === "PAUSED" ? "orange" : "blue";

export default function WhatsAppTemplatesPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Template[]>([]); const [selected, setSelected] = useState<Template>();
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [syncing, setSyncing] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(false); try { const r = await fetch("/api/whatsapp/templates", { cache: "no-store" }); if (!r.ok) throw new Error(); setRows(await r.json() as Template[]); } catch { setError(true); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const detail = async (id: string) => { try { const r = await fetch(`/api/whatsapp/templates/${id}`, { cache: "no-store" }); if (!r.ok) throw new Error(); setSelected(await r.json() as Template); } catch { message.error("Unable to load template details"); } };
  const reconcile = async () => { setSyncing(true); try { const r = await fetch("/api/whatsapp/templates", { method: "POST" }); if (!r.ok) throw new Error(); message.success("Templates reconciled with Meta"); await load(); } catch { message.error("Template reconciliation failed"); } finally { setSyncing(false); } };
  const rejected = rows.filter(row => row.status === "REJECTED" || row.status === "DISABLED");
  const columns: ColumnsType<Template> = [
    { title: "Template", render: (_, r) => <><Text strong>{r.metaTemplateName}</Text><br/><Text type="secondary">{r.definition.key} · v{r.definition.version}</Text></> },
    { title: "WABA", render: (_, r) => r.waba.businessName || r.waba.metaWabaId },
    { title: "Language", render: (_, r) => r.definition.language },
    { title: "Purpose", render: (_, r) => <Tag>{r.definition.purpose}</Tag> },
    { title: "Status", dataIndex: "status", render: v => <Tag color={color(v)}>{v}</Tag> },
    { title: "Action", render: (_, r) => <Button icon={<EyeOutlined/>} onClick={() => void detail(r.id)}>Details</Button> },
  ];
  return <WhatsAppShell activeKey="templates" status={<WhatsAppStatusBadge state={rows.some(r => r.status === "APPROVED") ? "CONNECTED" : "PENDING"}/>}>
    {rejected.length > 0 && <Alert type="error" showIcon icon={<WarningOutlined/>} message="Template action required" description={`${rejected.length} template(s) were rejected or disabled by Meta. Open details for the provider reason, then correct the definition before submitting a new version.`}/>}
    <Surface><Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}><div><Title level={3} style={{ margin: 0 }}>Message Templates</Title><Text type="secondary">WABA-specific template approval and synchronization state.</Text></div><Button type="primary" icon={<SyncOutlined/>} loading={syncing} onClick={() => void reconcile()}>Reconcile with Meta</Button></Space>
      {error ? <Alert type="error" showIcon message="Templates could not be loaded" action={<Button icon={<ReloadOutlined/>} onClick={() => void load()}>Retry</Button>}/> : <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} pagination={false} scroll={{ x: 800 }} locale={{ emptyText: <Empty description="No templates provisioned"/> }}/>}</Surface>
    <Drawer width={600} title="Template Detail" open={Boolean(selected)} onClose={() => setSelected(undefined)}>{selected && <><Descriptions bordered size="small" column={1} items={[{ key:"name", label:"Meta name", children:selected.metaTemplateName },{ key:"key", label:"Definition", children:`${selected.definition.key} v${selected.definition.version}` },{ key:"status", label:"Status", children:<Tag color={color(selected.status)}>{selected.status}</Tag> },{ key:"waba", label:"WABA", children:selected.waba.businessName || selected.waba.metaWabaId },{ key:"language", label:"Language", children:selected.definition.language },{ key:"category", label:"Category", children:selected.definition.category },{ key:"sync", label:"Last synchronized", children:selected.lastSyncedAt ? new Date(selected.lastSyncedAt).toLocaleString() : "Never" }]}/>{selected.rejectionReason && <Alert style={{ marginTop: 16 }} type="error" showIcon message="Meta rejected this template" description={selected.rejectionReason}/>}<Title level={5} style={{ marginTop: 20 }}>Message body</Title><Paragraph copyable>{selected.definition.body}</Paragraph>{selected.definition.footer && <Text type="secondary">Footer: {selected.definition.footer}</Text>}</>}</Drawer>
  </WhatsAppShell>;
}
