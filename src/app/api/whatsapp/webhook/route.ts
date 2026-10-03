import { getWhatsAppPlatformConfig } from "@/modules/whatsapp/config";
import { createWhatsAppWebhookService } from "@/modules/whatsapp/server";
import { verifyMetaSignature, verifyWebhookChallenge } from "@/modules/whatsapp/webhooks/metaWebhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getWhatsAppPlatformConfig();
  if (!config.enabled || !config.meta) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const challenge = verifyWebhookChallenge({ mode: params.get("hub.mode"), token: params.get("hub.verify_token"), challenge: params.get("hub.challenge") }, config.meta.webhookVerifyToken);
  return challenge ? new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } }) : new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const config = getWhatsAppPlatformConfig();
  if (!config.enabled || !config.meta) return new Response("Not found", { status: 404 });
  const rawBody = await request.text();
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), config.meta.appSecret)) return new Response("Invalid signature", { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
  try { await createWhatsAppWebhookService().receive(payload as never); return new Response("EVENT_RECEIVED", { status: 200 }); }
  catch { return new Response("Processing failed", { status: 500 }); }
}
