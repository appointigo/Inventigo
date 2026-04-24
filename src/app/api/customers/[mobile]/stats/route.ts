import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ mobile: string }> }
) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mobile } = await params;
    const stats = await customerService.getCustomerStatsByMobile(user.orgId!, decodeURIComponent(mobile));

    if (!stats) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
