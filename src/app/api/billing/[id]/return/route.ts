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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!Array.isArray(body.returnedItems) || body.returnedItems.length === 0) {
    return NextResponse.json({ error: "Returned items are required" }, { status: 400 });
  }

  try {
    const transaction = await billingService.createReturnTransaction(user.orgId!, id, user.id, {
      type: body.type ?? "RETURN",
      returnedItems: body.returnedItems.map((item: any) => ({
        productId: String(item.productId),
        sizeId: String(item.sizeId),
        quantity: Number(item.quantity),
        total: Number(item.total) || 0,
      })),
      exchangedItems: Array.isArray(body.exchangedItems)
        ? body.exchangedItems.map((item: any) => ({
            productId: String(item.productId),
            sizeId: String(item.sizeId),
            quantity: Number(item.quantity),
            total: Number(item.total) || 0,
          }))
        : [],
      refundAmount: Number(body.refundAmount ?? 0),
      offsetAmount: Number(body.offsetAmount ?? 0),
      refundMethod: typeof body.refundMethod === "string" ? body.refundMethod : undefined,
      topUpPayments: Array.isArray(body.topUpPayments)
        ? body.topUpPayments.map((entry: any) => ({
            method: String(entry.method ?? "").toUpperCase(),
            amount: Number(entry.amount ?? 0),
          }))
        : undefined,
      refundPayments: Array.isArray(body.refundPayments)
        ? body.refundPayments.map((entry: any) => ({
            method: String(entry.method ?? "").toUpperCase(),
            amount: Number(entry.amount ?? 0),
          }))
        : undefined,
      transactionDate: typeof body.transactionDate === "string" ? body.transactionDate : undefined,
      discountType: typeof body.discountType === "string" ? body.discountType : undefined,
      discountPercent: Number(body.discountPercent ?? 0),
      discountAmount: Number(body.discountAmount ?? 0),
      taxRate: Number(body.taxRate ?? 0),
      reason: typeof body.reason === "string" ? body.reason : undefined,
      condition: typeof body.condition === "string" ? body.condition : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      businessDate: typeof body.businessDate === "string" ? body.businessDate : undefined,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    // Known business-rule violations should return 400 with the message,
    // while unexpected failures return 500 for clearer debugging.
    const knownValidationErrors = [
      "Returned items are required",
      "Sale not found",
      "Only completed sales can be returned or exchanged",
      "Exchange/return window has expired",
      "Invalid returned quantity",
      "Returned item not found in original sale",
      "Invalid exchanged quantity",
      "Insufficient stock for exchange item",
      "Invalid payment method",
      "Payment amount must be greater than zero",
      "Top-up split payment total",
      "Refund split payment total",
    ];

    const isValidationError = knownValidationErrors.some((fragment) => message.includes(fragment));
    const status = isValidationError ? 400 : 500;

    if (!isValidationError) {
      console.error("/api/billing/[id]/return POST error", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
};
