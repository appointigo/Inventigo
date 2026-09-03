import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createWhatsAppAssetReader } from "@/modules/whatsapp/server";

export async function GET(_: Request, context: RouteContext<"/api/whatsapp/phone-numbers/[id]">) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppAssetReader().getPhoneNumber(user.orgId, (await context.params).id)
    );
  } catch (error) {
    return NextResponse.json(
      { error: "WhatsApp phone number not found" },
      { status: isWhatsAppError(error) ? 404 : 500 }
    );
  }
}
