import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const amount = Number(body?.amount ?? 0);
  const method = body?.method as "CASH" | "CARD" | "UPI";
  const note = typeof body?.note === "string" ? body.note : undefined;
  const businessDate = typeof body?.businessDate === "string" ? body.businessDate : undefined;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }
  if (!method || !["CASH", "CARD", "UPI"].includes(method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  try {
    const payment = await billingService.recordSalePayment(user.orgId!, id, user.id, {
      amount,
      method,
      note,
      businessDate,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
