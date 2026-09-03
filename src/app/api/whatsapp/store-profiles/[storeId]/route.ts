import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppStoreConfigurationService } from "@/modules/whatsapp/server";
import { storeProfileSchema } from "@/modules/whatsapp/storeConfigurationSchemas";
export async function GET(_: Request, context: { params: Promise<{ storeId: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppStoreConfigurationService().getProfile(
        user.orgId,
        (await context.params).storeId
      )
    );
  } catch {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
}
export async function PUT(request: Request, context: { params: Promise<{ storeId: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = storeProfileSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: body.error.issues[0]?.message || "Invalid profile" },
      { status: 400 }
    );
  try {
    return NextResponse.json(
      await createWhatsAppStoreConfigurationService().saveProfile(
        user.orgId,
        (await context.params).storeId,
        body.data
      )
    );
  } catch {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
}
