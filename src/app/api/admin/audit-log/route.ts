import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { auditLogService } from "@/modules/admin/services/auditLogService";

export const GET = async () => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const entries = await auditLogService.listEntries();
    return NextResponse.json(entries);
  } catch (err) {
    console.error("Admin audit log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
