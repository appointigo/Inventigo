export type EmbeddedSignupEvent = { event: "FINISH" | "CANCEL" | "ERROR"; wabaId?: string; phoneNumberId?: string };
export type ManualMetaOAuthConfiguration = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  redirectUri: string;
  state: string;
};
export type StoredMetaOAuthSession = ManualMetaOAuthConfiguration & { requestId: string };
export type MetaOAuthCallback =
  | { kind: "success"; code: string; state: string }
  | { kind: "error"; error: string; errorReason?: string; errorDescription?: string };
export const STOCKIVA_META_OAUTH_CALLBACK = "STOCKIVA_META_OAUTH_CALLBACK";
export const ACTIVE_META_OAUTH_SESSION_KEY = "stockiva_meta_oauth_session";
const META_OAUTH_CALLBACK_PARAMETERS = ["code", "state", "error", "error_reason", "error_description"] as const;

export function removeMetaOAuthCallbackParameters(href: string) {
  const url = new URL(href);
  for (const parameter of META_OAUTH_CALLBACK_PARAMETERS) url.searchParams.delete(parameter);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseStoredMetaOAuthSession(value: string | null): StoredMetaOAuthSession | null {
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<StoredMetaOAuthSession>;
    if (
      typeof session.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.requestId) ||
      typeof session.appId !== "string" || !/^\d+$/.test(session.appId) ||
      typeof session.configId !== "string" || !/^\d+$/.test(session.configId) ||
      typeof session.graphApiVersion !== "string" || !/^v\d+\.\d+$/.test(session.graphApiVersion) ||
      typeof session.redirectUri !== "string" ||
      typeof session.state !== "string" || session.state.length < 20 || session.state.length > 200
    ) return null;
    const redirectUri = new URL(session.redirectUri);
    if (redirectUri.protocol !== "https:" || redirectUri.pathname !== "/dashboard/whatsapp") return null;
    return session as StoredMetaOAuthSession;
  } catch {
    return null;
  }
}

export function buildManualMetaOAuthUrl(config: ManualMetaOAuthConfiguration) {
  const params = new URLSearchParams({
    client_id: config.appId,
    config_id: config.configId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: config.state,
  });
  return `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth?${params.toString()}`;
}

export function parseMetaOAuthCallback(search: string): MetaOAuthCallback | null {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  const errorReason = params.get("error_reason");
  const errorDescription = params.get("error_description");
  if (error || errorReason || errorDescription) return {
    kind: "error",
    error: (error || "oauth_error").slice(0, 100),
    ...(errorReason ? { errorReason: errorReason.slice(0, 100) } : {}),
    ...(errorDescription ? { errorDescription: errorDescription.slice(0, 300) } : {}),
  };

  const code = params.get("code");
  const state = params.get("state");
  if (!code && !state) return null;
  if (!code || !state || code.length > 4096 || state.length < 20 || state.length > 200) {
    return { kind: "error", error: "invalid_oauth_callback" };
  }
  return { kind: "success", code, state };
}

export function parseStockivaMetaOAuthMessage(value: unknown): MetaOAuthCallback | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.type !== STOCKIVA_META_OAUTH_CALLBACK) return null;
  if (typeof message.code === "string" && typeof message.state === "string") {
    return parseMetaOAuthCallback(new URLSearchParams({ code: message.code, state: message.state }).toString());
  }
  if (typeof message.error === "string") {
    return parseMetaOAuthCallback(new URLSearchParams({
      error: message.error,
      ...(typeof message.errorReason === "string" ? { error_reason: message.errorReason } : {}),
      ...(typeof message.errorDescription === "string" ? { error_description: message.errorDescription } : {}),
    }).toString());
  }
  return null;
}

export function claimEmbeddedSignupCompletion(claims: Set<string>, requestId: string) {
  if (claims.has(requestId)) return false;
  claims.add(requestId);
  return true;
}

export async function readWhatsAppApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Expected a JSON response from Stockiva but received ${contentType || "an unknown content type"}.`
    );
  }
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error("Stockiva returned an invalid JSON response.");
  }
}

export function parseEmbeddedSignupMessage(origin: string, value: unknown): EmbeddedSignupEvent | null {
  if (!/^https:\/\/([a-z0-9-]+\.)*facebook\.com$/i.test(origin) || typeof value !== "string") return null;
  try {
    const message = JSON.parse(value) as { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string } };
    if (message.type !== "WA_EMBEDDED_SIGNUP" || !(["FINISH", "CANCEL", "ERROR"] as string[]).includes(message.event ?? "")) return null;
    return { event: message.event as EmbeddedSignupEvent["event"], wabaId: message.data?.waba_id, phoneNumberId: message.data?.phone_number_id };
  } catch { return null; }
}
