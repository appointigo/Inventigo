import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { platformUsersService } from "@/modules/admin/services/platformUsersService";
import { auditLogService } from "@/modules/admin/services/auditLogService";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
    }

    const user = await platformUsersService.toggleUserActive(id, isActive);

    await auditLogService.createEntry({
      action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      targetType: "User",
      targetId: id,
      targetName: user.name,
      performedBy: admin.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin user patch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
