"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleOutlined, FileDoneOutlined, MessageOutlined, ReloadOutlined, SafetyCertificateOutlined, ShopOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, List, Result, Space, Spin, Tag, Typography } from "antd";
import WhatsAppActionRequiredAlert from "./WhatsAppActionRequiredAlert";
import WhatsAppSetupProgress from "./WhatsAppSetupProgress";
import WhatsAppShell from "./WhatsAppShell";
import { WhatsAppErrorState, WhatsAppLoadingState } from "./WhatsAppStateCard";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import type { WhatsAppUiState } from "../ui";
import { parseEmbeddedSignupMessage } from "../embeddedSignupClient";
import { CapabilityCard, CardGrid, Hero, HeroIcon, ProgressPanel, RequirementList, Surface, TwoColumn } from "./WhatsAppSetupPage.styled";

const { Title, Paragraph, Text } = Typography;
type Phone = { id: string; metaPhoneNumberId: string; displayPhoneNumber: string; verifiedName: string | null; qualityRating: string | null; status: string };
type Waba = { id: string; metaWabaId: string; businessName: string | null; status: string; currency: string | null; timezone: string | null; phoneNumbers: Phone[] };
type StatusResponse = { state: WhatsAppUiState; connectedAt: string | null; lastSyncedAt: string | null; businessAccountCount: number; phoneNumberCount: number; businessAccounts: Waba[] };
type SessionResponse = { state: string; requestId: string; appId: string; configId: string; redirectUri: string; graphApiVersion: string };
type SetupPhase = "idle" | "handoff" | "syncing" | "cancelled" | "failed";
type FacebookResponse = { authResponse?: { code?: string }; status?: string };
type FacebookSdk = { init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void; login(callback: (response: FacebookResponse) => void, options: Record<string, unknown>): void };

declare global { interface Window { FB?: FacebookSdk; fbAsyncInit?: () => void } }

const capabilities = [
  { icon: <FileDoneOutlined />, title: "Send invoices", detail: "Share transaction documents from the correct Store sender." },
  { icon: <MessageOutlined />, title: "Customer updates", detail: "Prepare for approved order, payment, and support messages." },
  { icon: <SafetyCertificateOutlined />, title: "Tenant-safe setup", detail: "Keep every business account and phone number isolated by organization." },
];

function loadMetaSdk(appId: string, version: string) {
  return new Promise<FacebookSdk>((resolve, reject) => {
    const initialize = () => { if (!window.FB) return reject(new Error("Meta SDK unavailable")); window.FB.init({ appId, cookie: true, xfbml: false, version }); resolve(window.FB); };
    if (window.FB) return initialize();
    window.fbAsyncInit = initialize;
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;
    const script = document.createElement("script"); script.id = "facebook-jssdk"; script.async = true; script.defer = true; script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js"; script.onerror = () => reject(new Error("Meta SDK failed to load")); document.head.appendChild(script);
  });
}

export default function WhatsAppSetupPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [phase, setPhase] = useState<SetupPhase>("idle"); const [flowError, setFlowError] = useState<string>();
  const selectedWabas = useRef<string[]>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true); setError(false);
    try { const response = await fetch("/api/whatsapp/status", { cache: "no-store" }); if (!response.ok) throw new Error(); setStatus(await response.json() as StatusResponse); }
    catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const data = parseEmbeddedSignupMessage(event.origin, event.data);
      if (data?.event === "FINISH" && data.wabaId) selectedWabas.current = [data.wabaId];
      if (data?.event === "CANCEL") setPhase("cancelled");
      if (data?.event === "ERROR") { setFlowError("Meta reported an error while completing Embedded Signup."); setPhase("failed"); }
    };
    window.addEventListener("message", receive); return () => window.removeEventListener("message", receive);
  }, []);

  const complete = useCallback(async (session: SessionResponse, code: string) => {
    setPhase("syncing");
    if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] backend_completion_started", { requestId: session.requestId, authorizationCodePresent: Boolean(code), selectedWabaCount: selectedWabas.current.length });
    const response = await fetch("/api/whatsapp/embedded-signup/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: session.requestId, code, state: session.state, ...(selectedWabas.current.length ? { selectedWabaIds: selectedWabas.current } : {}) }) });
    const body = await response.json() as { code?: string; error?: string; requestId?: string };
    if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] backend_completion_received", { requestId: body.requestId ?? session.requestId, ok: response.ok, httpStatus: response.status, errorCode: body.code });
    if (!response.ok) throw new Error(body.error || "WhatsApp setup could not be completed.");
    await loadStatus(); setPhase("idle");
  }, [loadStatus]);

  const connect = useCallback(async () => {
    setFlowError(undefined); setPhase("handoff"); selectedWabas.current = [];
    try {
      const response = await fetch("/api/whatsapp/embedded-signup/session", { method: "POST" });
      const responseBody = await response.json() as SessionResponse & { error?: string };
      if (!response.ok) throw new Error(response.status === 403 ? "Only an organization owner or admin can connect WhatsApp." : responseBody.error || "WhatsApp setup is currently unavailable.");
      const session = responseBody; const sdk = await loadMetaSdk(session.appId, session.graphApiVersion);
      const redirectUrl = new URL(session.redirectUri);
      if (window.location.origin !== redirectUrl.origin) throw new Error(`Open Stockiva at ${redirectUrl.origin} before connecting WhatsApp.`);
      if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] facebook_login_started", { requestId: session.requestId });
      sdk.login(result => { const code = result.authResponse?.code; if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] facebook_auth_callback", { requestId: session.requestId, status: result.status, authorizationCodePresent: Boolean(code) }); if (!code) { setPhase("cancelled"); return; } void complete(session, code).catch(reason => { if (process.env.NODE_ENV === "development") console.error("[WhatsApp Signup] frontend_completion_failed", { requestId: session.requestId, message: reason instanceof Error ? reason.message : "Unknown setup error" }); setFlowError(reason instanceof Error ? reason.message : "WhatsApp setup failed."); setPhase("failed"); }); }, { config_id: session.configId, redirect_uri: session.redirectUri, response_type: "code", override_default_response_type: true });
    } catch (reason) { setFlowError(reason instanceof Error ? reason.message : "WhatsApp setup failed."); setPhase("failed"); }
  }, [complete]);

  const sync = useCallback(async () => {
    setPhase("syncing"); setFlowError(undefined);
    try { const response = await fetch("/api/whatsapp/sync", { method: "POST" }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "Sync failed"); await loadStatus(); setPhase("idle"); }
    catch (reason) { setFlowError(reason instanceof Error ? reason.message : "Sync failed"); setPhase("failed"); }
  }, [loadStatus]);

  const currentState = status?.state ?? "NOT_CONNECTED"; const isDisconnected = currentState === "NOT_CONNECTED" || currentState === "DISCONNECTED";
  return <WhatsAppShell status={<WhatsAppStatusBadge state={currentState} />}>
    {loading ? <Surface><WhatsAppLoadingState /></Surface> : error ? <Surface><WhatsAppErrorState onRetry={() => void loadStatus()} /></Surface> : phase === "syncing" ? <Surface><Result icon={<Spin size="large" />} title="Setting up WhatsApp" subTitle="Stockiva is securely exchanging authorization and syncing your business accounts and phone numbers." extra={<WhatsAppSetupProgress current={2} />} /></Surface> : isDisconnected ? <>
      {phase === "cancelled" && <Alert type="info" showIcon closable title="Meta setup was cancelled" description="Nothing was connected. You can continue again whenever you’re ready." onClose={() => setPhase("idle")} />}
      {phase === "failed" && <Alert type="error" showIcon title="WhatsApp could not be connected" description={flowError} action={<Button onClick={() => void connect()}>Retry</Button>} />}
      <Hero><div><HeroIcon><WhatsAppOutlined /></HeroIcon><Title level={3}>Connect WhatsApp to Stockiva</Title><Paragraph type="secondary">You’ll continue to Meta to choose a business you own and authorize Stockiva. Meta handles sign-in; Stockiva never sees your Meta password.</Paragraph><Space wrap><Button type="primary" size="large" loading={phase === "handoff"} icon={<WhatsAppOutlined />} onClick={() => void connect()}>Continue with Meta</Button><Text type="secondary">You can cancel before authorization is completed.</Text></Space></div><ProgressPanel><Text strong>Setup progress</Text><Paragraph type="secondary">Authorize Meta, then Stockiva will sync the assets you granted.</Paragraph><WhatsAppSetupProgress current={phase === "handoff" ? 1 : 0} /></ProgressPanel></Hero>
      <Surface><Title level={4}>What you’ll be able to do</Title><CardGrid>{capabilities.map(item => <CapabilityCard key={item.title}>{item.icon}<Title level={5}>{item.title}</Title><Paragraph type="secondary">{item.detail}</Paragraph></CapabilityCard>)}</CardGrid></Surface>
      <TwoColumn><Surface><Title level={4}><ShopOutlined /> What you need</Title><RequirementList><li>A Meta Business portfolio you are authorized to manage.</li><li>A WhatsApp Business Account and an eligible business phone number.</li><li>Permission to grant WhatsApp business-management and messaging access.</li></RequirementList></Surface><Surface><Title level={4}><CheckCircleOutlined /> Your business stays in control</Title><Paragraph type="secondary">Your organization remains the owner of its Meta assets. Stockiva scopes every granted account and number to this organization.</Paragraph><Alert type="info" showIcon title="Meta billing is separate" description="Meta messaging charges remain the merchant’s responsibility and are separate from Stockiva." /></Surface></TwoColumn>
    </> : <>
      {(currentState === "ACTION_REQUIRED" || currentState === "SUSPENDED" || currentState === "ERROR") && <WhatsAppActionRequiredAlert message="Sync again after resolving business verification, phone registration, or permissions in Meta." />}
      {phase === "failed" && <Alert type="error" showIcon title="WhatsApp sync failed" description={flowError} />}
      <Surface><Space direction="vertical" size="large" style={{ width: "100%" }}><div><Title level={3}>WhatsApp setup</Title><Paragraph type="secondary">These accounts and phone numbers were read from Meta and persisted for your organization.</Paragraph></div><WhatsAppSetupProgress current={currentState === "CONNECTED" ? 3 : 2} /><Space wrap><Button type="primary" icon={<ReloadOutlined />} loading={phase === "handoff"} onClick={() => void sync()}>Sync with Meta</Button><Button onClick={() => void connect()}>Reconnect permissions</Button>{status?.lastSyncedAt && <Text type="secondary">Last synced {new Date(status.lastSyncedAt).toLocaleString()}</Text>}</Space></Space></Surface>
      <Surface><Title level={4}>Business accounts ({status?.businessAccountCount ?? 0})</Title><List dataSource={status?.businessAccounts ?? []} locale={{ emptyText: "No WhatsApp Business Account was returned. Sync again after completing setup in Meta." }} renderItem={waba => <List.Item><List.Item.Meta title={<Space>{waba.businessName || "WhatsApp Business Account"}<Tag color={waba.status === "ACTIVE" ? "green" : "orange"}>{waba.status}</Tag></Space>} description={<><Text type="secondary">WABA ID {waba.metaWabaId}</Text><Descriptions size="small" column={1} items={waba.phoneNumbers.map(phone => ({ key: phone.id, label: phone.verifiedName || "Phone number", children: <Space wrap><Text>{phone.displayPhoneNumber}</Text><Tag color={phone.status === "ACTIVE" ? "green" : "orange"}>{phone.status}</Tag>{phone.qualityRating && <Tag>Quality {phone.qualityRating}</Tag>}</Space> }))} /></>} /></List.Item>} /></Surface>
    </>}
  </WhatsAppShell>;
}
