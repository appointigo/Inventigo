import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppStoreConfigurationService } from "@/modules/whatsapp/server";
import { senderMappingSchema } from "@/modules/whatsapp/storeConfigurationSchemas";
const authorize = async () => {
  const user = await requireOrgAuth().catch(() => null);
  return user && (user.role === "OWNER" || user.role === "ADMIN") ? user : null;
};
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Unauthorized or forbidden" }, { status: 403 });
  const body = senderMappingSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: body.error.issues[0]?.message || "Invalid mapping" },
      { status: 400 }
    );
  try {
    return NextResponse.json(
      await createWhatsAppStoreConfigurationService().updateMapping(
        user.orgId,
        (await context.params).id,
        body.data
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 409 }
    );
  }
}
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Unauthorized or forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createWhatsAppStoreConfigurationService().deleteMapping(
        user.orgId,
        (await context.params).id
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 404 }
    );
  }
}
