import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppStoreConfigurationService } from "@/modules/whatsapp/server";
import { senderMappingSchema } from "@/modules/whatsapp/storeConfigurationSchemas";
export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = senderMappingSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: body.error.issues[0]?.message || "Invalid mapping" },
      { status: 400 }
    );
  try {
    return NextResponse.json(
      await createWhatsAppStoreConfigurationService().createMapping(user.orgId, body.data),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mapping failed" },
      { status: 409 }
    );
  }
}
