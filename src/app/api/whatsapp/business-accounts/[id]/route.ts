import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createWhatsAppAssetReader } from "@/modules/whatsapp/server";

const notFound = () =>
  NextResponse.json({ error: "WhatsApp Business Account not found" }, { status: 404 });
export async function GET(
  _: Request,
  context: RouteContext<"/api/whatsapp/business-accounts/[id]">
) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppAssetReader().getBusinessAccount(user.orgId, (await context.params).id)
    );
  } catch (error) {
    return isWhatsAppError(error)
      ? notFound()
      : NextResponse.json({ error: "Unable to load account" }, { status: 500 });
  }
}
export async function DELETE(
  _: Request,
  context: RouteContext<"/api/whatsapp/business-accounts/[id]">
) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createWhatsAppAssetReader().disconnectBusinessAccount(
        user.orgId,
        (await context.params).id
      )
    );
  } catch (error) {
    return isWhatsAppError(error)
      ? notFound()
      : NextResponse.json({ error: "Unable to disconnect account" }, { status: 500 });
  }
}
