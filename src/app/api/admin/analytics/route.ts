import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { analyticsService } from "@/modules/admin/services/analyticsService";

export const GET = async () => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await analyticsService.getData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
