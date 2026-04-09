import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { announcementsService } from "@/modules/admin/services/announcementsService";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { isActive } = await req.json();
  await announcementsService.toggleActive(id, isActive);
  return NextResponse.json({ ok: true });
}
