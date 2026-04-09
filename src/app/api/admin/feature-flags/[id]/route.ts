import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { featureFlagsService } from "@/modules/admin/services/featureFlagsService";
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
    const { value } = body;

    if (typeof value !== "boolean") {
      return NextResponse.json({ error: "value (boolean) is required" }, { status: 400 });
    }

    const flag = await featureFlagsService.toggleFlag(id, value);

    await auditLogService.createEntry({
      action: "FLAG_TOGGLED",
      targetType: "FeatureFlag",
      targetId: id,
      targetName: flag.key,
      performedBy: admin.id,
      metadata: { value },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin flag toggle error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
