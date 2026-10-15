export type VerificationEmailKind = "signup" | "resend";
export type VerificationDelivery = "email" | "console";

export class VerificationEmailError extends Error {
  constructor(
    public readonly reason: "NOT_CONFIGURED" | "PROVIDER_REJECTED" | "NETWORK_ERROR",
    public readonly providerStatus?: number,
  ) {
    super(`Verification email delivery failed: ${reason}`);
    this.name = "VerificationEmailError";
  }
}

export function verificationCodeConsoleEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AUTH_VERIFICATION_CONSOLE_MODE === "true";
}

/** Expose a test code to the browser only for a same-origin localhost request. */
export function verificationCodeBrowserEnabled(requestUrl: string, origin: string | null): boolean {
  if (!verificationCodeConsoleEnabled() || !origin) return false;
  const url = new URL(requestUrl);
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && origin === url.origin;
}

export function verificationEmailConfigured(options: { apiKey?: string; from?: string } = {}): boolean {
  if (verificationCodeConsoleEnabled()) return true;
  const apiKey = options.apiKey?.trim() ?? process.env.RESEND_API_KEY?.trim();
  const from = options.from?.trim() ?? process.env.AUTH_EMAIL_FROM?.trim();
  return Boolean(apiKey && from && !/@resend\.dev\b/i.test(from));
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  kind: VerificationEmailKind,
  options: { apiKey?: string; from?: string; fetcher?: typeof fetch } = {},
): Promise<VerificationDelivery> {
  if (verificationCodeConsoleEnabled()) {
    console.info(`[auth:verification-code] ${kind} ${email}: ${code}`);
    return "console";
  }

  const apiKey = options.apiKey?.trim() ?? process.env.RESEND_API_KEY?.trim();
  const from = options.from?.trim() ?? process.env.AUTH_EMAIL_FROM?.trim();
  // Resend's sample domain is limited to testing, so it is never a valid
  // sender for a public signup flow.
  if (!verificationEmailConfigured({ apiKey, from })) {
    throw new VerificationEmailError("NOT_CONFIGURED");
  }

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: kind === "signup" ? "Verify your Stockiva account" : "Your Stockiva verification code",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2>Verify your email</h2><p>Your Stockiva verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 15 minutes.</p><p>If you did not request this, you can ignore this email.</p></div>`,
        text: `Your Stockiva verification code is ${code}. It expires in 15 minutes.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new VerificationEmailError("NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new VerificationEmailError("PROVIDER_REJECTED", response.status);
  }
  return "email";
}
