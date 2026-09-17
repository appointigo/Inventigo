import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createMetaBackend, createWhatsAppTemplateService } from "@/modules/whatsapp/server";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { buildWhatsAppFailureDiagnostic, isWhatsAppDebugDiagnosticsEnabled } from "@/modules/whatsapp/diagnostics";

function safeFailureDiagnostic(error: unknown) {
  if (!error || typeof error !== "object") return { errorType: typeof error };
  const value = error as { name?: unknown; code?: unknown; clientVersion?: unknown };
  return {
    errorType: typeof value.name === "string" ? value.name : "UnknownError",
    errorCode: typeof value.code === "string" ? value.code : undefined,
    clientVersion: typeof value.clientVersion === "string" ? value.clientVersion : undefined,
  };
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  console.info("[WhatsApp Templates] list_started", {
    requestId,
    organizationId: user.orgId,
  });
  try {
    const templates = await createWhatsAppTemplateService().list(user.orgId);
    console.info("[WhatsApp Templates] list_completed", {
      requestId,
      organizationId: user.orgId,
      templateCount: templates.length,
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("[WhatsApp Templates] list_failed", {
      requestId,
      organizationId: user.orgId,
      ...safeFailureDiagnostic(error),
    });
    return NextResponse.json(
      { error: "WhatsApp templates could not be loaded", code: "TEMPLATE_LIST_FAILED", requestId },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  console.info("[WhatsApp Templates] request_received", { requestId });
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  console.info("[WhatsApp Templates] authenticated", {
    requestId,
    organizationId: user.orgId,
  });
  let currentStage = "authenticated";
  try {
    return NextResponse.json(await createMetaBackend().templates.reconcileInvoiceV1({
      organizationId: user.orgId,
      requestId,
      report: stage => { currentStage = stage; },
    }));
  }
  catch (error) {
    const code = isWhatsAppError(error) ? error.code : "TEMPLATE_SYNC_FAILED";
    return NextResponse.json(
      {
        ok: false,
        error: "WhatsApp templates could not be synchronized",
        code,
        requestId,
        ...(isWhatsAppDebugDiagnosticsEnabled() && {
          diagnostic: buildWhatsAppFailureDiagnostic(
            error,
            currentStage,
            Date.now() - startedAt
          ),
        }),
      },
      { status: code === "WHATSAPP_NOT_CONNECTED" ? 409 : 502 }
    );
  }
}
