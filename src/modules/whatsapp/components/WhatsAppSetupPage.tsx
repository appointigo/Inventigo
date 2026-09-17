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
import { buildWhatsAppSetupMilestones } from "../setupMilestones";
import { ACTIVE_META_OAUTH_SESSION_KEY, buildManualMetaOAuthUrl, claimEmbeddedSignupCompletion, logWhatsAppApiFailure, parseEmbeddedSignupMessage, parseMetaOAuthCallback, parseStockivaMetaOAuthMessage, parseStoredMetaOAuthSession, readWhatsAppApiJson, removeMetaOAuthCallbackParameters, STOCKIVA_META_OAUTH_CALLBACK } from "../embeddedSignupClient";
import type { MetaOAuthCallback, StoredMetaOAuthSession } from "../embeddedSignupClient";
import { CapabilityCard, CardGrid, Hero, HeroIcon, ProgressPanel, RequirementList, Surface, TwoColumn } from "./WhatsAppSetupPage.styled";

const { Title, Paragraph, Text } = Typography;
const USE_MANUAL_META_OAUTH = true;
type Phone = { id: string; metaPhoneNumberId: string; displayPhoneNumber: string; verifiedName: string | null; qualityRating: string | null; status: string };
type Waba = { id: string; metaWabaId: string; businessName: string | null; status: string; currency: string | null; timezone: string | null; phoneNumbers: Phone[] };
type StatusResponse = { state: WhatsAppUiState; connectedAt: string | null; lastSyncedAt: string | null; metaAuthorized: boolean; wabaConnected: boolean; phoneConnected: boolean; webhookSubscribed: boolean; phoneRegistrationComplete: boolean; businessAccountCount: number; phoneNumberCount: number; businessAccounts: Waba[] };
type TemplateResponse = Array<{ status: string }>;
type ReadinessResponse = { overallStatus: "READY" | "ACTION_REQUIRED" | "SETUP_IN_PROGRESS" | "NOT_CONNECTED" };
type SessionResponse = StoredMetaOAuthSession;
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
  const [templates, setTemplates] = useState<TemplateResponse>([]);
  const [readiness, setReadiness] = useState<ReadinessResponse>();
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [phase, setPhase] = useState<SetupPhase>("idle"); const [flowError, setFlowError] = useState<string>();
  const selectedWabas = useRef<string[]>([]);
  const selectedPhoneNumber = useRef<string | null>(null);
  const submittedSignupRequests = useRef(new Set<string>());
  const oauthPopup = useRef<Window | null>(null);
  const oauthPopupCloseMonitor = useRef<number | null>(null);
  const pendingOAuthCallback = useRef<MetaOAuthCallback | null>(null);
  const activeSignupSession = useRef<SessionResponse | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [response, templateResponse, readinessResponse] = await Promise.all([
        fetch("/api/whatsapp/status", { cache: "no-store" }),
        fetch("/api/whatsapp/templates", { cache: "no-store" }),
        fetch("/api/whatsapp/readiness?purpose=TRANSACTIONAL", { cache: "no-store" }),
      ]);
      if (!response.ok) throw new Error();
      setStatus(await response.json() as StatusResponse);
      setTemplates(templateResponse.ok ? await templateResponse.json() as TemplateResponse : []);
      setReadiness(readinessResponse.ok ? await readinessResponse.json() as ReadinessResponse : undefined);
    }
    catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => () => {
    if (oauthPopupCloseMonitor.current !== null) window.clearInterval(oauthPopupCloseMonitor.current);
  }, []);
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const callback = parseMetaOAuthCallback(window.location.search);
    if (!callback) return;
    window.history.replaceState(window.history.state, "", removeMetaOAuthCallbackParameters(window.location.href));
    pendingOAuthCallback.current = callback;
    if (callback.kind === "error") {
      setFlowError("Meta authorization was cancelled or could not be completed.");
      setPhase(callback.errorReason === "user_denied" ? "cancelled" : "failed");
    }
    if (window.opener) {
      window.opener.postMessage(callback.kind === "success" ? {
        type: STOCKIVA_META_OAUTH_CALLBACK,
        code: callback.code,
        state: callback.state,
      } : {
        type: STOCKIVA_META_OAUTH_CALLBACK,
        error: callback.error,
        errorReason: callback.errorReason,
        errorDescription: callback.errorDescription,
      }, window.location.origin);
      window.close();
    }
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const data = parseEmbeddedSignupMessage(event.origin, event.data);
      if (data?.event === "FINISH" && data.wabaId) selectedWabas.current = [data.wabaId];
      if (data?.event === "FINISH" && data.phoneNumberId) selectedPhoneNumber.current = data.phoneNumberId;
      if (data?.event === "CANCEL") setPhase("cancelled");
      if (data?.event === "ERROR") { setFlowError("Meta reported an error while completing Embedded Signup."); setPhase("failed"); }
    };
    window.addEventListener("message", receive); return () => window.removeEventListener("message", receive);
  }, []);

  const complete = useCallback(async (session: SessionResponse, code: string) => {
    if (!claimEmbeddedSignupCompletion(submittedSignupRequests.current, session.requestId)) return;
    setPhase("syncing");
    if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] backend_completion_started", { requestId: session.requestId, authorizationCodePresent: Boolean(code), selectedWabaCount: selectedWabas.current.length });
    const response = await fetch("/api/whatsapp/embedded-signup/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: session.requestId, code, state: session.state, ...(selectedWabas.current.length ? { selectedWabaIds: selectedWabas.current } : {}), ...(selectedPhoneNumber.current ? { selectedPhoneNumberId: selectedPhoneNumber.current } : {}) }) });
    if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] backend_completion_response", { requestId: session.requestId, url: response.url, status: response.status, redirected: response.redirected, contentType: response.headers.get("content-type") });
    const body = await readWhatsAppApiJson<{ code?: string; error?: string; requestId?: string; diagnostic?: Record<string, unknown> }>(response);
    if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] backend_completion_received", { requestId: body.requestId ?? session.requestId, ok: response.ok, httpStatus: response.status, errorCode: body.code, diagnostic: body.diagnostic });
    if (!response.ok) throw new Error(body.code === "UNAUTHORIZED" || (response.status === 401 && !body.code) ? "Your Stockiva session expired. Sign in again before connecting WhatsApp." : body.error || "WhatsApp setup could not be completed.");
    await loadStatus(); setPhase("idle");
  }, [loadStatus]);

  const handleOAuthCallback = useCallback((callback: MetaOAuthCallback, session: SessionResponse) => {
    sessionStorage.removeItem(ACTIVE_META_OAUTH_SESSION_KEY);
    activeSignupSession.current = null;
    if (callback.kind === "error") {
      setFlowError("Meta authorization was cancelled or could not be completed.");
      setPhase(callback.errorReason === "user_denied" ? "cancelled" : "failed");
      return;
    }
    if (callback.state !== session.state) {
      setFlowError("Meta authorization returned an invalid signup state. Please try again.");
      setPhase("failed");
      return;
    }
    void complete(session, callback.code).catch(reason => {
      if (process.env.NODE_ENV === "development") console.error("[WhatsApp Signup] frontend_completion_failed", { requestId: session.requestId, message: reason instanceof Error ? reason.message : "Unknown setup error" });
      setFlowError(reason instanceof Error ? reason.message : "WhatsApp setup failed.");
      setPhase("failed");
    });
  }, [complete]);

  useEffect(() => {
    const receiveOAuthCallback = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== oauthPopup.current) return;
      const callback = parseStockivaMetaOAuthMessage(event.data);
      const session = activeSignupSession.current;
      if (!callback || !session) return;
      if (oauthPopupCloseMonitor.current !== null) window.clearInterval(oauthPopupCloseMonitor.current);
      oauthPopupCloseMonitor.current = null;
      oauthPopup.current?.close();
      oauthPopup.current = null;
      handleOAuthCallback(callback, session);
    };
    window.addEventListener("message", receiveOAuthCallback);
    return () => window.removeEventListener("message", receiveOAuthCallback);
  }, [handleOAuthCallback]);

  useEffect(() => {
    if (window.opener || !pendingOAuthCallback.current) return;
    const session = parseStoredMetaOAuthSession(sessionStorage.getItem(ACTIVE_META_OAUTH_SESSION_KEY));
    if (!session) {
      setFlowError("The Meta authorization session could not be restored. Please start again.");
      setPhase("failed");
      return;
    }
    activeSignupSession.current = session;
    handleOAuthCallback(pendingOAuthCallback.current, session);
  }, [handleOAuthCallback]);

  const connect = useCallback(async () => {
    setFlowError(undefined); setPhase("handoff"); selectedWabas.current = []; selectedPhoneNumber.current = null;
    let manualPopup: Window | null = null;
    try {
      if (window.location.protocol !== "https:") throw new Error("WhatsApp setup requires an allowed HTTPS address.");
      if (USE_MANUAL_META_OAUTH) {
        manualPopup = oauthPopup.current && !oauthPopup.current.closed
          ? oauthPopup.current
          : window.open("", "stockiva_meta_oauth", "popup=yes,width=720,height=760");
        if (!manualPopup) throw new Error("Meta authorization popup was blocked. Allow popups for Stockiva and try again.");
        oauthPopup.current = manualPopup;
        manualPopup.focus();
      }
      const response = await fetch("/api/whatsapp/embedded-signup/session", { method: "POST" });
      const responseBody = await response.json() as SessionResponse & { error?: string; code?: string };
      if (!response.ok) throw new Error(response.status === 403 && !responseBody.code ? "Only an organization owner or admin can connect WhatsApp." : responseBody.error || "WhatsApp setup is currently unavailable.");
      const session = responseBody;
      const redirectUrl = new URL(session.redirectUri);
      if (window.location.origin !== redirectUrl.origin || redirectUrl.pathname !== "/dashboard/whatsapp") throw new Error("This WhatsApp setup session is not valid for the current secure origin.");
      if (USE_MANUAL_META_OAUTH && manualPopup) {
        activeSignupSession.current = session;
        sessionStorage.setItem(ACTIVE_META_OAUTH_SESSION_KEY, JSON.stringify(session));
        if (process.env.NODE_ENV === "development") console.info("[WhatsApp OAuth] authorization_config", {
          appId: session.appId,
          configId: session.configId,
          redirectUri: session.redirectUri,
          statePresent: Boolean(session.state),
        });
        const oauthUrl = buildManualMetaOAuthUrl({
          appId: session.appId,
          configId: session.configId,
          graphApiVersion: session.graphApiVersion,
          redirectUri: session.redirectUri,
          state: session.state,
        });
        manualPopup.location.href = oauthUrl;
        manualPopup.focus();
        if (oauthPopupCloseMonitor.current !== null) window.clearInterval(oauthPopupCloseMonitor.current);
        const watchedPopup = manualPopup;
        oauthPopupCloseMonitor.current = window.setInterval(() => {
          if (!watchedPopup.closed) return;
          if (oauthPopupCloseMonitor.current !== null) window.clearInterval(oauthPopupCloseMonitor.current);
          oauthPopupCloseMonitor.current = null;
          if (oauthPopup.current === watchedPopup) oauthPopup.current = null;
          sessionStorage.removeItem(ACTIVE_META_OAUTH_SESSION_KEY);
          activeSignupSession.current = null;
          setPhase(current => current === "handoff" ? "cancelled" : current);
        }, 500);
        return;
      }
      const sdk = await loadMetaSdk(session.appId, session.graphApiVersion);
      if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] facebook_login_started", { requestId: session.requestId });
      sdk.login(result => { const code = result.authResponse?.code; if (process.env.NODE_ENV === "development") console.info("[WhatsApp Signup] facebook_auth_callback", { requestId: session.requestId, status: result.status, authorizationCodePresent: Boolean(code) }); if (!code) { setPhase("cancelled"); return; } void complete(session, code).catch(reason => { if (process.env.NODE_ENV === "development") console.error("[WhatsApp Signup] frontend_completion_failed", { requestId: session.requestId, message: reason instanceof Error ? reason.message : "Unknown setup error" }); setFlowError(reason instanceof Error ? reason.message : "WhatsApp setup failed."); setPhase("failed"); }); }, { config_id: session.configId, response_type: "code", override_default_response_type: true, extras: { setup: {}, sessionInfoVersion: "3" } });
    } catch (reason) {
      if (manualPopup && !manualPopup.closed) manualPopup.close();
      if (oauthPopup.current === manualPopup) oauthPopup.current = null;
      sessionStorage.removeItem(ACTIVE_META_OAUTH_SESSION_KEY);
      activeSignupSession.current = null;
      setFlowError(reason instanceof Error ? reason.message : "WhatsApp setup failed."); setPhase("failed");
    }
  }, [complete]);

  const sync = useCallback(async () => {
    setPhase("syncing"); setFlowError(undefined);
    try {
      const response = await fetch("/api/whatsapp/sync", { method: "POST" });
      if (!response.ok) {
        const failure = await readWhatsAppApiJson<{
          error?: string;
          code?: string;
          requestId?: string;
          diagnostic?: Record<string, unknown>;
        }>(response);
        logWhatsAppApiFailure("sync_failed", failure);
        throw new Error("Unable to synchronize with Meta.");
      }
      await loadStatus(); setPhase("idle");
    }
    catch (reason) { setFlowError(reason instanceof Error ? reason.message : "Unable to synchronize with Meta."); setPhase("failed"); }
  }, [loadStatus]);

  const currentState = status?.state ?? "NOT_CONNECTED"; const isDisconnected = currentState === "NOT_CONNECTED" || currentState === "DISCONNECTED";
  const milestones = buildWhatsAppSetupMilestones({
    integrationState: currentState,
    businessAccounts: status?.businessAccounts ?? [],
    templateStatuses: templates.map(template => template.status),
    readiness: readiness?.overallStatus,
    metaAuthorized: status?.metaAuthorized,
    wabaConnected: status?.wabaConnected,
    phoneConnected: status?.phoneConnected,
    webhookSubscribed: status?.webhookSubscribed,
    phoneRegistrationComplete: status?.phoneRegistrationComplete,
  });
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
      <Surface><Title level={4}>Setup status</Title><List dataSource={milestones} renderItem={milestone => <List.Item><List.Item.Meta avatar={<CheckCircleOutlined style={{ color: milestone.complete ? "#52c41a" : "#fa8c16", fontSize: 22 }} />} title={<Space wrap><Text strong>{milestone.label}</Text><Tag color={milestone.complete ? "green" : "orange"}>{milestone.state}</Tag></Space>} description={milestone.description} /></List.Item>} /></Surface>
      <Surface><Title level={4}>Business accounts ({status?.businessAccountCount ?? 0})</Title><List dataSource={status?.businessAccounts ?? []} locale={{ emptyText: "No WhatsApp Business Account was returned. Sync again after completing setup in Meta." }} renderItem={waba => <List.Item><List.Item.Meta title={<Space>{waba.businessName || "WhatsApp Business Account"}<Tag color={waba.status === "ACTIVE" ? "green" : "orange"}>{waba.status}</Tag></Space>} description={<><Text type="secondary">WABA ID {waba.metaWabaId}</Text><Descriptions size="small" column={1} items={waba.phoneNumbers.map(phone => ({ key: phone.id, label: phone.verifiedName || "Phone number", children: <Space wrap><Text>{phone.displayPhoneNumber}</Text><Tag color={phone.status === "ACTIVE" ? "green" : "orange"}>{phone.status}</Tag>{phone.qualityRating && <Tag>Quality {phone.qualityRating}</Tag>}</Space> }))} /></>} /></List.Item>} /></Surface>
    </>}
  </WhatsAppShell>;
}
