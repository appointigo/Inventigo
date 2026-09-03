import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppConversationService } from "@/modules/whatsapp/server";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppConversationService().get(user.orgId, (await context.params).id)
    );
  } catch {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
