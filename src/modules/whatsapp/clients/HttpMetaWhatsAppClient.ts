import { WhatsAppError } from "../errors.ts";
import type { WhatsAppCredentialStore } from "../credentials/WhatsAppCredentialStore.ts";
import type { MetaCodeExchangeResult, MetaCreateTemplateRequest, MetaMessageTemplate, MetaPhoneNumber, MetaSendMessageRequest, MetaSendMessageResult, MetaTemplateContext, MetaTemplateStatus, MetaTokenInspection, MetaWaba, MetaWhatsAppClient } from "./MetaWhatsAppClient.ts";

type Config = { appId: string; appSecret: string; graphApiVersion: string; timeoutMs: number };
type MetaErrorBody = { error?: { message?: string; code?: number; error_subcode?: number; type?: string; fbtrace_id?: string } };

if (typeof window !== "undefined") throw new Error("HttpMetaWhatsAppClient is server-only");

export class HttpMetaWhatsAppClient implements MetaWhatsAppClient {
  constructor(private readonly config: Config, private readonly credentials: WhatsAppCredentialStore, private readonly fetcher: typeof fetch = fetch) {}

  private async request<T>(path: string, accessToken?: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(`https://graph.facebook.com/${this.config.graphApiVersion}${path}`, {
        ...init, signal: controller.signal, headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), "Content-Type": "application/json", ...init.headers },
      });
      const body = await response.json().catch(() => ({})) as T & MetaErrorBody;
      if (!response.ok || body.error) throw this.normalize(body.error, response.status);
      return body;
    } catch (error) {
      if (error instanceof WhatsAppError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new WhatsAppError("META_TIMEOUT", "Meta request timed out", { retryable: true, cause: error });
      throw new WhatsAppError("META_PROVIDER_FAILED", "Meta request failed", { retryable: true, cause: error });
    } finally { clearTimeout(timeout); }
  }

  private normalize(error: MetaErrorBody["error"], status: number) {
    const details = { providerCode: error?.code, providerSubcode: error?.error_subcode, httpStatus: status, traceId: error?.fbtrace_id };
    if (status === 401 || [102, 190].includes(error?.code ?? -1)) return new WhatsAppError("META_AUTH_FAILED", "Meta authorization failed", { details });
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
    const result = await this.request<{ messages?: Array<{ id?: string }> }>(`/${input.metaPhoneNumberId}/messages`, accessToken, { method: "POST", body: JSON.stringify(body) });
    const id = result.messages?.[0]?.id;
    if (!id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta accepted the request without a message id");
    return { providerMessageId: id, acceptedAt: new Date() };
  }

  async exchangeEmbeddedSignupCode(code: string): Promise<MetaCodeExchangeResult> {
    const params = new URLSearchParams({ client_id: this.config.appId, client_secret: this.config.appSecret, code });
    const result = await this.request<{ access_token?: string; expires_in?: number }>(`/oauth/access_token?${params}`);
    if (!result.access_token) throw new WhatsAppError("EMBEDDED_SIGNUP_INVALID_CODE", "Meta did not return an access token");
    return { accessToken: result.access_token, expiresAt: result.expires_in ? new Date(Date.now() + result.expires_in * 1000) : undefined };
  }

  async inspectToken(token: string): Promise<MetaTokenInspection> {
    const appToken = `${this.config.appId}|${this.config.appSecret}`;
    const result = await this.request<{ data?: { app_id?: string; is_valid?: boolean; expires_at?: number; scopes?: string[]; granular_scopes?: Array<{ scope: string; target_ids?: string[] }> } }>(`/debug_token?input_token=${encodeURIComponent(token)}`, appToken);
    const data = result.data;
    if (!data?.app_id) throw new WhatsAppError("META_INVALID_RESPONSE", "Meta token inspection response was incomplete");
    return { appId: data.app_id, isValid: data.is_valid === true, expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined, scopes: data.scopes ?? [], granularScopes: (data.granular_scopes ?? []).map(x => ({ scope: x.scope, targetIds: x.target_ids ?? [] })) };
  }
  async getWaba(id: string, token: string): Promise<MetaWaba> {
    const x = await this.request<{ id: string; name?: string; currency?: string; timezone_id?: string }>(`/${id}?fields=id,name,currency,timezone_id`, token);
    return { id: x.id, name: x.name, currency: x.currency, timezoneId: x.timezone_id };
  }
  async listPhoneNumbers(id: string, token: string): Promise<MetaPhoneNumber[]> {
    const x = await this.request<{ data?: Array<{ id: string; display_phone_number: string; verified_name?: string; quality_rating?: string; code_verification_status?: string; platform_type?: string }> }>(`/${id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`, token);
    return (x.data ?? []).map(p => ({ id: p.id, displayPhoneNumber: p.display_phone_number, verifiedName: p.verified_name, qualityRating: p.quality_rating, codeVerificationStatus: p.code_verification_status, platformType: p.platform_type }));
  }
  async registerPhoneNumber(id: string, pin: string, token: string) { await this.request(`/${id}/register`, token, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", pin }) }); }
  async subscribeApp(id: string, token: string) { await this.request(`/${id}/subscribed_apps`, token, { method: "POST", body: "{}" }); }

  async listMessageTemplates(input: MetaTemplateContext): Promise<MetaMessageTemplate[]> {
    const token = await this.credentials.resolve(input.credentialRef, input.organizationId);
    const templates: MetaMessageTemplate[] = [];
    let after: string | undefined;
    do {
      const params = new URLSearchParams({ fields: "id,name,language,category,status,rejected_reason", limit: "100" });
      if (after) params.set("after", after);
      const result = await this.request<{ data?: RawMetaTemplate[]; paging?: { cursors?: { after?: string }; next?: string } }>(`/${input.metaWabaId}/message_templates?${params}`, token);
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
