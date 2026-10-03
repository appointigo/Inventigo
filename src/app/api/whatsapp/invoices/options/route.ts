import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppInvoiceTemplateService } from "@/modules/whatsapp/server";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: { "x-request-id": requestId } });
  const storeId = new URL(request.url).searchParams.get("storeId") || user.storeId;
  if (!storeId) return NextResponse.json({ error: "Store is required", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  console.info("[WhatsApp Invoice Options] request_received", { requestId, organizationId: user.orgId, storeId });
  try {
    const options = await createWhatsAppInvoiceTemplateService().options(user.orgId, storeId, requestId);
    console.info("[WhatsApp Invoice Options] response_sent", { requestId, organizationId: user.orgId, storeId, enabled: options.enabled, optionCount: options.templates.length, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ...options, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.warn("[WhatsApp Invoice Options] failed", { requestId, organizationId: user.orgId, storeId, errorCode: error instanceof Error ? error.message : "INVOICE_OPTIONS_FAILED", durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice options could not be loaded", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }
}
