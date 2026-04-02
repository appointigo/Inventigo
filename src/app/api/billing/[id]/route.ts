import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sale = await billingService.getSaleById(user.orgId!, id);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
  return NextResponse.json(sale);
}

