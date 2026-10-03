import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { buildWhatsAppFailureDiagnostic, isWhatsAppDebugDiagnosticsEnabled } from "@/modules/whatsapp/diagnostics";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  console.info("[WhatsApp Sync] request_received", { requestId });
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  console.info("[WhatsApp Sync] authenticated", { requestId, organizationId: user.orgId });
  let currentStage = "authenticated";
  const report = (stage: string, details: Record<string, unknown> = {}) => {
    currentStage = stage;
    console.info(`[WhatsApp Sync] ${stage}`, {
      requestId,
      organizationId: user.orgId,
      ...details,
    });
  };
  try { return NextResponse.json(await createMetaBackend().signup.sync(user.orgId, report)); }
  catch (error) {
    const code = isWhatsAppError(error) ? error.code : "META_PROVIDER_FAILED";
    const details = isWhatsAppError(error) ? error.details : undefined;
    console.error("[WhatsApp Sync] failed", {
      requestId,
      organizationId: user.orgId,
      code,
      durationMs: Date.now() - startedAt,
      upstreamHttpStatus: details?.httpStatus,
      metaErrorCode: details?.providerCode,
      metaErrorSubcode: details?.providerSubcode,
      metaErrorType: details?.providerType,
      sanitizedMetaMessage: details?.providerMessage,
      metaContentType: details?.contentType,
      fbtraceId: details?.traceId,
    });
    return NextResponse.json({
      ok: false,
      error: "WhatsApp sync failed",
      code,
      requestId,
      ...(isWhatsAppDebugDiagnosticsEnabled() && {
        diagnostic: buildWhatsAppFailureDiagnostic(
          error,
          currentStage,
          Date.now() - startedAt
        ),
      }),
    }, { status: code === "WHATSAPP_NOT_CONNECTED" ? 409 : 502 });
  }
}
