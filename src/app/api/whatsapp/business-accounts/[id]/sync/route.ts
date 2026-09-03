import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export async function POST(
  _: Request,
  context: RouteContext<"/api/whatsapp/business-accounts/[id]/sync">
) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createMetaBackend().assets.syncBusinessAccount(user.orgId, (await context.params).id)
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Account sync failed",
        code: isWhatsAppError(error) ? error.code : "META_PROVIDER_FAILED",
      },
      {
        status:
          isWhatsAppError(error) && error.code === "EMBEDDED_SIGNUP_ASSET_MISMATCH" ? 404 : 502,
      }
    );
  }
}
