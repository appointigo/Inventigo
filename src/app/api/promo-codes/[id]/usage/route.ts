import { NextResponse } from "next/server";
import { promoService } from "@/modules/promo-codes/services/promoService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const usage = await promoService.getUsage(user.orgId, id);
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
