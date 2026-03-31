import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth.middleware";
import { platformService } from "@/modules/admin/services/platformService";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const org = await platformService.getOrgDetail(id);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (err) {
    console.error("Admin org detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
