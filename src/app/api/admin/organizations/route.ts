import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { platformService } from "@/modules/admin/services/platformService";

export const GET = async () => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const orgs = await platformService.listOrgs();
    return NextResponse.json(orgs);
  } catch (err) {
    console.error("Admin orgs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
