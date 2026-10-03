import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/customers/by-mobile/[mobile]/stats">
) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { mobile } = await context.params;
    const stats = await customerService.getCustomerStatsByMobile(
      user.orgId,
      decodeURIComponent(mobile)
    );
    if (!stats) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: /invalid/i.test(message) ? 400 : 500 }
    );
  }
}
