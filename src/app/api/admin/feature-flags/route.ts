import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { featureFlagsService } from "@/modules/admin/services/featureFlagsService";
import { auditLogService } from "@/modules/admin/services/auditLogService";

export const GET = async () => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const flags = await featureFlagsService.listFlags();
    return NextResponse.json(flags);
  } catch (err) {
    console.error("Admin feature flags error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, value, scope, description } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const flag = await featureFlagsService.createFlag({
      key,
      value: value ?? false,
      scope: scope ?? "GLOBAL",
      description: description ?? "",
    });

    await auditLogService.createEntry({
      action: "FLAG_CREATED",
      targetType: "FeatureFlag",
      targetId: flag.id,
      targetName: key,
      performedBy: admin.id,
    });

    return NextResponse.json(flag, { status: 201 });
  } catch (err) {
    console.error("Admin create flag error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
