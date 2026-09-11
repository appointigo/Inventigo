const HTTPS_PROTOCOL = "https:";

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim();
}

/** Normalize an HTTPS URL that represents an origin, not an application path. */
export function normalizeWhatsAppOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== HTTPS_PROTOCOL ||
      url.hostname.includes("*") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parseWhatsAppAllowedOrigins(value: string): string[] {
  const entries = value.split(",").map(entry => entry.trim());
  if (!entries.length || entries.some(entry => !entry))
    throw new Error("WHATSAPP_ALLOWED_ORIGINS must be a comma-separated list of HTTPS origins");

  const origins = entries.map(entry => {
    const origin = normalizeWhatsAppOrigin(entry);
    if (!origin)
      throw new Error("WHATSAPP_ALLOWED_ORIGINS must contain only HTTPS origins without paths, queries, or wildcards");
    return origin;
  });
  return [...new Set(origins)];
}

export function isWhatsAppOriginAllowed(
  origin: string,
  allowedOrigins: readonly string[],
  nodeEnv: string | undefined = process.env.NODE_ENV
) {
  const normalized = normalizeWhatsAppOrigin(origin);
  if (normalized === null) return false;
  if (allowedOrigins.includes(normalized)) return true;
  if (nodeEnv !== "development") return false;

  const hostname = new URL(normalized).hostname;
  return hostname === "trycloudflare.com" || hostname.endsWith(".trycloudflare.com");
}

/**
 * Prefer the browser-supplied Origin for this same-origin POST. When it is not
 * present, reconstruct the public origin from proxy headers and finally the
 * request URL. Every candidate is accepted only after an exact allowlist match.
 */
export function resolveWhatsAppPublicOrigin(
  request: Request,
  allowedOrigins: readonly string[],
  nodeEnv: string | undefined = process.env.NODE_ENV
): string | null {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== null)
    return isWhatsAppOriginAllowed(requestOrigin, allowedOrigins, nodeEnv)
      ? normalizeWhatsAppOrigin(requestOrigin)
      : null;

  const requestUrl = new URL(request.url);
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(request.headers.get("host"));
  const protocol = forwardedProto ? `${forwardedProto.replace(/:$/, "")}:` : requestUrl.protocol;
  const proxyOrigin = host ? `${protocol}//${host}` : requestUrl.origin;

  return isWhatsAppOriginAllowed(proxyOrigin, allowedOrigins, nodeEnv)
    ? normalizeWhatsAppOrigin(proxyOrigin)
    : null;
}
