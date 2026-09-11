// TODO: Replace this temporary development hardcode with validated environment/session configuration.
export const META_MANUAL_OAUTH_REDIRECT_URI =
  "https://seniors-xml-carmen-spot.trycloudflare.com/dashboard/whatsapp";

export function getMetaEmbeddedSignupRedirectUri() {
  return process.env.NODE_ENV === "development"
    ? META_MANUAL_OAUTH_REDIRECT_URI
    : undefined;
}
