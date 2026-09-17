import { WhatsAppError } from "../errors.ts";
import type { WhatsAppCredentialStore } from "../credentials/WhatsAppCredentialStore.ts";
import { META_MANUAL_OAUTH_REDIRECT_URI } from "../embeddedSignupRedirect.ts";
import type { MetaCodeExchangeRequest, MetaCodeExchangeResult, MetaCreateTemplateRequest, MetaMessageTemplate, MetaPhoneNumber, MetaSendMessageRequest, MetaSendMessageResult, MetaTemplateContext, MetaTemplateStatus, MetaTokenInspection, MetaWaba, MetaWhatsAppClient } from "./MetaWhatsAppClient.ts";

type Config = { appId: string; appSecret: string; graphApiVersion: string; timeoutMs: number };
type MetaErrorBody = { error?: { message?: string; code?: number; error_subcode?: number; type?: string; fbtrace_id?: string } };
type MetaResponseDiagnostic = { httpStatus: number; contentType: string; durationMs: number };

function sanitizeMetaMessage(message?: string) {
  if (!message) return undefined;
  return message
    .replace(/\bEAA[A-Za-z0-9_-]+\b/g, "[REDACTED_TOKEN]")
    .replace(/(\b(?:code|access_token|client_secret)=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 300);
}

if (typeof window !== "undefined") throw new Error("HttpMetaWhatsAppClient is server-only");

export class HttpMetaWhatsAppClient implements MetaWhatsAppClient {
  constructor(private readonly config: Config, private readonly credentials: WhatsAppCredentialStore, private readonly fetcher: typeof fetch = fetch) {}

  private async request<T>(path: string, accessToken?: string, init: RequestInit = {}, captureDiagnostic?: (diagnostic: MetaResponseDiagnostic) => void): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await this.fetcher(`https://graph.facebook.com/${this.config.graphApiVersion}${path}`, {
        ...init, signal: controller.signal, headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), "Content-Type": "application/json", ...init.headers },
      });
      const contentType = response.headers.get("content-type") ?? "";
      captureDiagnostic?.({
        httpStatus: response.status,
        contentType,
        durationMs: Date.now() - startedAt,
      });
      if (process.env.NODE_ENV === "development") {
        console.info("[WhatsApp Meta] response", JSON.stringify({
          status: response.status,
          contentType,
          durationMs: Date.now() - startedAt,
        }));
      }
      const rawBody = await response.text();
      let body: T & MetaErrorBody;
      try {
        body = contentType.toLowerCase().includes("application/json")
          ? JSON.parse(rawBody) as T & MetaErrorBody
          : {} as T & MetaErrorBody;
      } catch {
        throw new WhatsAppError("META_INVALID_RESPONSE", "Meta returned invalid JSON", {
          details: { httpStatus: response.status, contentType },
        });
      }
      if (!response.ok || body.error) throw this.normalize(body.error, response.status, contentType);
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new WhatsAppError("META_INVALID_RESPONSE", "Meta returned a non-JSON response", {
          details: { httpStatus: response.status, contentType },
        });
      }
      return body;
    } catch (error) {
      if (error instanceof WhatsAppError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new WhatsAppError("META_TIMEOUT", "Meta request timed out", { retryable: true, cause: error });
      throw new WhatsAppError("META_PROVIDER_FAILED", "Meta request failed", { retryable: true, cause: error });
    } finally { clearTimeout(timeout); }
  }

  private normalize(error: MetaErrorBody["error"], status: number, contentType?: string) {
    const details = {
      providerCode: error?.code,
      providerSubcode: error?.error_subcode,
      providerType: error?.type,
      providerMessage: sanitizeMetaMessage(error?.message),
      httpStatus: status,
      contentType,
      traceId: error?.fbtrace_id,
    };
    if (status === 401 || [102, 190, 191].includes(error?.code ?? -1) || error?.error_subcode === 36008) return new WhatsAppError("META_AUTH_FAILED", "Meta authorization failed", { details });
    if (status === 429 || [4, 17, 32, 613, 80004].includes(error?.code ?? -1)) return new WhatsAppError("META_RATE_LIMITED", "Meta rate limit reached", { retryable: true, details });
    return new WhatsAppError("META_PROVIDER_FAILED", "Meta rejected the request", { retryable: status >= 500, details });
  }

  async sendMessage(input: MetaSendMessageRequest): Promise<MetaSendMessageResult> {
    const accessToken = await this.credentials.resolve(input.credentialRef, input.organizationId);
    const common = { messaging_product: "whatsapp", recipient_type: "individual", to: input.recipient };
    let body: Record<string, unknown>;
    if (input.content.type === "TEXT") body = { ...common, type: "text", text: { body: input.content.text, preview_url: false } };
    else if (input.content.type === "TEMPLATE" && input.template) {
      const values = Object.entries(input.content.template.variables ?? {}).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([, text]) => ({ type: "text", text }));
      body = { ...common, type: "template", template: { name: input.template.metaTemplateName, language: { code: input.template.language }, ...(values.length ? { components: [{ type: "body", parameters: values }] } : {}) } };
    } else if (["IMAGE", "DOCUMENT", "VIDEO"].includes(input.content.type)) {
      const content = input.content as { type: "IMAGE" | "DOCUMENT" | "VIDEO"; mediaUrl: string; caption?: string; filename?: string };
      const type = content.type.toLowerCase();
      body = { ...common, type, [type]: { link: content.mediaUrl, ...(content.caption ? { caption: content.caption } : {}), ...(content.type === "DOCUMENT" && content.filename ? { filename: content.filename } : {}) } };
    } else throw new WhatsAppError("META_SEND_FAILED", "Unsupported WhatsApp content type");
    let httpStatus: number | undefined;
    const result = await this.request<{ messages?: Array<{ id?: string }> }>(`/${input.metaPhoneNumberId}/messages`, accessToken, { method: "POST", body: JSON.stringify(body) }, diagnostic => { httpStatus = diagnostic.httpStatus; });
    const id = result.messages?.[0]?.id;
    if (!id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta accepted the request without a message id");
    return { providerMessageId: id, acceptedAt: new Date(), httpStatus };
  }

  async exchangeEmbeddedSignupCode(input: MetaCodeExchangeRequest): Promise<MetaCodeExchangeResult> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      code: input.code,
      redirect_uri: META_MANUAL_OAUTH_REDIRECT_URI,
    });
    if (process.env.NODE_ENV === "development") {
      console.info("[WhatsApp OAuth] code_exchange_config", {
        redirectUri: META_MANUAL_OAUTH_REDIRECT_URI,
      });
      console.info(`[WhatsApp Complete] code_exchange_config ${JSON.stringify({
        redirectUriPresent: true,
      })}`);
    }
    const result = await this.request<{ access_token?: string; expires_in?: number }>(`/oauth/access_token?${params}`);
    if (!result.access_token) throw new WhatsAppError("EMBEDDED_SIGNUP_INVALID_CODE", "Meta did not return an access token");
    return { accessToken: result.access_token, expiresAt: result.expires_in ? new Date(Date.now() + result.expires_in * 1000) : undefined };
  }

  async inspectToken(token: string): Promise<MetaTokenInspection> {
    const appToken = `${this.config.appId}|${this.config.appSecret}`;
    const result = await this.request<{ data?: { app_id?: string; is_valid?: boolean; type?: string; expires_at?: number; data_access_expires_at?: number; scopes?: string[]; granular_scopes?: Array<{ scope: string; target_ids?: string[] }> } }>(`/debug_token?input_token=${encodeURIComponent(token)}`, appToken);
    const data = result.data;
    if (!data?.app_id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta token inspection response was incomplete");
    return {
      appId: data.app_id,
      isValid: data.is_valid === true,
      type: data.type,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
      dataAccessExpiresAt: data.data_access_expires_at ? new Date(data.data_access_expires_at * 1000) : undefined,
      scopes: data.scopes ?? [],
      granularScopes: (data.granular_scopes ?? []).map(x => ({ scope: x.scope, targetIds: x.target_ids ?? [] })),
    };
  }
  async getWaba(id: string, token: string): Promise<MetaWaba> {
    const x = await this.request<{ id?: string; name?: string; currency?: string; timezone_id?: string }>(`/${id}?fields=id,name,currency,timezone_id`, token);
    if (x.id !== id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta returned unexpected WhatsApp Business Account metadata");
    return { id: x.id, name: x.name, currency: x.currency, timezoneId: x.timezone_id };
  }
  async listPhoneNumbers(id: string, token: string): Promise<MetaPhoneNumber[]> {
    const x = await this.request<{ data?: Array<{ id?: string; display_phone_number?: string; verified_name?: string; quality_rating?: string; name_status?: string; code_verification_status?: string; platform_type?: string; status?: string; is_pin_enabled?: boolean }> }>(`/${id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type,status,is_pin_enabled`, token);
    return (x.data ?? []).map(phone => {
      if (!phone.id || !phone.display_phone_number) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta returned incomplete WhatsApp phone number metadata");
      return { id: phone.id, displayPhoneNumber: phone.display_phone_number, verifiedName: phone.verified_name, qualityRating: phone.quality_rating, nameStatus: phone.name_status, codeVerificationStatus: phone.code_verification_status, platformType: phone.platform_type, status: phone.status, isPinEnabled: phone.is_pin_enabled };
    });
  }
  async registerPhoneNumber(id: string, pin: string, token: string) {
    try {
      const result = await this.request<{ success?: boolean }>(`/${id}/register`, token, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", pin }) });
      if (result.success !== true) throw new WhatsAppError("PHONE_REGISTRATION_FAILED", "Meta did not confirm phone registration");
    } catch (error) {
      if (error instanceof WhatsAppError && error.code === "PHONE_REGISTRATION_FAILED") throw error;
      throw new WhatsAppError("PHONE_REGISTRATION_FAILED", "Meta could not register the WhatsApp phone number", {
        retryable: error instanceof WhatsAppError ? error.retryable : false,
        details: error instanceof WhatsAppError ? error.details : undefined,
        cause: error,
      });
    }
  }
  async subscribeApp(id: string, token: string) {
    const result = await this.request<{ success?: boolean }>(`/${id}/subscribed_apps`, token, { method: "POST", body: "{}" });
    if (result.success !== true) throw new WhatsAppError("WEBHOOK_SUBSCRIPTION_FAILED", "Meta did not confirm the WABA webhook subscription");
  }
  async isAppSubscribed(id: string, appId: string, token: string) {
    const result = await this.request<{ data?: Array<{ whatsapp_business_api_data?: { id?: string } }> }>(`/${id}/subscribed_apps`, token);
    if (!Array.isArray(result.data)) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta returned incomplete WABA subscription metadata");
    return result.data.some(subscription => subscription.whatsapp_business_api_data?.id === appId);
  }

  async listMessageTemplates(input: MetaTemplateContext): Promise<MetaMessageTemplate[]> {
    const token = await this.credentials.resolve(input.credentialRef, input.organizationId);
    const templates: MetaMessageTemplate[] = [];
    let after: string | undefined;
    do {
      const params = new URLSearchParams({ fields: "id,name,language,category,status,rejected_reason", limit: "100" });
      if (after) params.set("after", after);
      let diagnostic: MetaResponseDiagnostic | undefined;
      const result = await this.request<{ data?: RawMetaTemplate[]; paging?: { cursors?: { after?: string }; next?: string } }>(
        `/${input.metaWabaId}/message_templates?${params}`,
        token,
        {},
        value => { diagnostic = value; }
      );
      console.info("[WhatsApp Templates] meta_fetch_completed", {
        requestId: input.requestId,
        organizationId: input.organizationId,
        wabaId: input.metaWabaId,
        templateName: input.templateName,
        httpStatus: diagnostic?.httpStatus,
        contentType: diagnostic?.contentType,
        durationMs: diagnostic?.durationMs,
        resultCount: result.data?.length ?? 0,
      });
      templates.push(...(result.data ?? []).map(normalizeTemplate));
      after = result.paging?.next ? result.paging.cursors?.after : undefined;
    } while (after);
    return templates;
  }

  async createMessageTemplate(input: MetaCreateTemplateRequest): Promise<MetaMessageTemplate> {
    const token = await this.credentials.resolve(input.credentialRef, input.organizationId);
    const components = input.components.map(component => component.type === "BODY"
      ? { type: component.type, text: component.text, ...(component.example ? { example: { body_text: component.example.bodyText } } : {}) }
      : component);
    const result = await this.request<RawMetaTemplate>(`/${input.metaWabaId}/message_templates`, token, {
      method: "POST", body: JSON.stringify({ name: input.name, language: input.language, category: input.category, components }),
    });
    if (!result.id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta created a template without returning its id");
    return normalizeTemplate({ ...result, name: result.name ?? input.name, language: result.language ?? input.language, category: result.category ?? input.category, status: result.status ?? "PENDING" });
  }
}

type RawMetaTemplate = { id?: string; name?: string; language?: string; category?: string; status?: string; rejected_reason?: string };
const supportedTemplateStatuses = new Set<MetaTemplateStatus>(["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"]);
function normalizeTemplate(template: RawMetaTemplate): MetaMessageTemplate {
  if (!template.id || !template.name || !template.language || !template.category) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta template response was incomplete");
  const status = supportedTemplateStatuses.has(template.status as MetaTemplateStatus) ? template.status as MetaTemplateStatus : "PENDING";
  return { id: template.id, name: template.name, language: template.language, category: template.category, status, rejectionReason: template.rejected_reason };
}
