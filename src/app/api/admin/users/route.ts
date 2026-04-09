import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { platformUsersService } from "@/modules/admin/services/platformUsersService";

export const GET = async () => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [users, stats] = await Promise.all([
      platformUsersService.listUsers(),
      platformUsersService.getStats(),
    ]);
    return NextResponse.json({ users, stats });
  } catch (err) {
    console.error("Admin users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
