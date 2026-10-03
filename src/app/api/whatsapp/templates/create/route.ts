import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  buildWhatsAppFailureDiagnostic,
  isWhatsAppDebugDiagnosticsEnabled,
} from "@/modules/whatsapp/diagnostics";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createMetaBackend } from "@/modules/whatsapp/server";
import { merchantTemplateDraftSchema } from "@/modules/whatsapp/templateCreationSchemas";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = merchantTemplateDraftSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid template",
        code: "TEMPLATE_NAME_INVALID",
      },
      { status: 400 }
    );
  try {
    const template = await createMetaBackend().merchantTemplates.create(
      user.orgId,
      parsed.data
    );
    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error) {
    const code = isWhatsAppError(error) ? error.code : "TEMPLATE_CREATE_FAILED";
    const status = code === "TEMPLATE_ALREADY_EXISTS" ? 409
      : code === "WHATSAPP_NOT_CONNECTED" ? 409
      : 502;
    return NextResponse.json({
      ok: false,
      error: isWhatsAppError(error) ? error.message : "Template creation failed",
      code,
      requestId,
      ...(isWhatsAppDebugDiagnosticsEnabled() && {
        diagnostic: buildWhatsAppFailureDiagnostic(
          error,
          "template_submission",
          Date.now() - startedAt
        ),
      }),
    }, { status });
  }
}
