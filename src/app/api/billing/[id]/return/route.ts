import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";

const parseTransactionItem = (item: unknown) => {
  const record = item && typeof item === "object" ? item as Record<string, unknown> : {};

  return {
    productId: String(record.productId),
    sizeId: String(record.sizeId),
    quantity: Number(record.quantity),
    total: Number(record.total) || 0,
  };
};

const parsePaymentEntry = (entry: unknown) => {
  const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};

  return {
    method: String(record.method ?? "").toUpperCase(),
    amount: Number(record.amount ?? 0),
  };
};

const parseTransactionType = (value: unknown) =>
  value === "RETURN" || value === "EXCHANGE" || value === "RETURN_EXCHANGE" ? value : "RETURN";

const parseDiscountType = (value: unknown) =>
  value === "PERCENTAGE" || value === "FLAT" ? value : undefined;

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

  const payload = body as Record<string, unknown>;
  const returnedItemsPayload = Array.isArray(payload.returnedItems) ? payload.returnedItems : [];
  const exchangedItemsPayload = Array.isArray(payload.exchangedItems) ? payload.exchangedItems : [];
  const topUpPaymentsPayload = Array.isArray(payload.topUpPayments) ? payload.topUpPayments : undefined;
  const refundPaymentsPayload = Array.isArray(payload.refundPayments) ? payload.refundPayments : undefined;
  const hasReturnedItems = returnedItemsPayload.length > 0;
  const hasExchangedItems = exchangedItemsPayload.length > 0;

  if (!hasReturnedItems && !hasExchangedItems) {
    return NextResponse.json({ error: "Returned or exchanged items are required" }, { status: 400 });
  }

  try {
    const transaction = await billingService.createReturnTransaction(user.orgId!, id, user.id, {
      type: parseTransactionType(payload.type),
      returnedItems: returnedItemsPayload.map(parseTransactionItem),
      exchangedItems: exchangedItemsPayload.map(parseTransactionItem),
      refundAmount: Number(payload.refundAmount ?? 0),
      offsetAmount: Number(payload.offsetAmount ?? 0),
      refundMethod: typeof payload.refundMethod === "string" ? payload.refundMethod : undefined,
      topUpPayments: topUpPaymentsPayload?.map(parsePaymentEntry),
      refundPayments: refundPaymentsPayload?.map(parsePaymentEntry),
      transactionDate: typeof payload.transactionDate === "string" ? payload.transactionDate : undefined,
      discountType: parseDiscountType(payload.discountType),
      discountPercent: Number(payload.discountPercent ?? 0),
      discountAmount: Number(payload.discountAmount ?? 0),
      taxRate: Number(payload.taxRate ?? 0),
      reason: typeof payload.reason === "string" ? payload.reason : undefined,
      condition: typeof payload.condition === "string" ? payload.condition : undefined,
      notes: typeof payload.notes === "string" ? payload.notes : undefined,
      businessDate: typeof payload.businessDate === "string" ? payload.businessDate : undefined,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";

    // Known business-rule violations should return 400 with the message,
    // while unexpected failures return 500 for clearer debugging.
    const knownValidationErrors = [
      "Returned items are required",
      "Returned or exchanged items are required",
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
