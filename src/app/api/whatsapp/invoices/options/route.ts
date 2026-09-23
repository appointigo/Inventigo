import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppInvoiceTemplateService } from "@/modules/whatsapp/server";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const storeId = new URL(request.url).searchParams.get("storeId") || user.storeId;
  if (!storeId) return NextResponse.json({ error: "Store is required" }, { status: 400 });
  try {
    return NextResponse.json(await createWhatsAppInvoiceTemplateService().options(user.orgId, storeId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice options could not be loaded" }, { status: 400 });
  }
}
