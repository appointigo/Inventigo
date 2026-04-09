import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { announcementsService } from "@/modules/admin/services/announcementsService";

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await announcementsService.listEntries();
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const entry = await announcementsService.createEntry({
    ...body,
    createdBy: session.id,
  });
  return NextResponse.json(entry, { status: 201 });
}
