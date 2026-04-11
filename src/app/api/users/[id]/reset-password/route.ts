import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { userService } from "@/modules/settings/services/userService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }

  if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  if (!body.newPassword || body.newPassword.length < 6) {
    return NextResponse.json(
      { error: "newPassword must be at least 6 characters" },
      { status: 400 }
    );
  }
  const ok = await userService.resetPassword(user.orgId, id, body.newPassword);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
