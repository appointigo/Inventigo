import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { conversationQuerySchema } from "@/modules/whatsapp/messageSchemas";
import { createWhatsAppConversationService } from "@/modules/whatsapp/server";
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = conversationQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters" },
      { status: 400 }
    );
  return NextResponse.json(await createWhatsAppConversationService().list(user.orgId, parsed.data));
}
