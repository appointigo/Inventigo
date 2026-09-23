import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import type { SaleHistoryStatusFilter } from "@/modules/billing/types";

export const GET = async (request: NextRequest) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const sp = request.nextUrl.searchParams;
    const filters = {
      startDate: sp.get("startDate") ?? undefined,
      endDate: sp.get("endDate") ?? undefined,
      status: (sp.get("status") as SaleHistoryStatusFilter) ?? undefined,
      paymentMethod: (sp.get("paymentMethod") as "CASH" | "CARD" | "UPI") ?? undefined,
      type: (sp.get("type") as "SALE" | "EXCHANGE" | "RETURN") ?? undefined,
      search: sp.get("search") ?? undefined,
    };
    const sales = await billingService.getSales(user.orgId!, filters);
    return NextResponse.json(sales);
  } 
  catch (error) {
    console.error("/api/billing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = async (request: NextRequest) => {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: { "x-request-id": requestId } });
  }

  if (!user.storeId) {
    return NextResponse.json({ error: "No store associated with your account", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }

  console.info("[Billing] request_received", { requestId, organizationId: user.orgId, storeId: user.storeId, operation: "CREATE_SALE" });
  try {
    const body = await request.json();
    const sale = await billingService.createSale(user.orgId!, user.storeId, user.id, body, { correlationId: requestId });
    console.info("[Billing] response_sent", { requestId, organizationId: user.orgId, storeId: user.storeId, operation: "CREATE_SALE", transactionId: sale.id, invoiceNumber: sale.invoiceNumber, invoiceDeliveryId: sale.invoiceDelivery?.id, invoiceDeliveryStatus: sale.invoiceDelivery?.status, httpStatus: 201, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ...sale, requestId }, { status: 201, headers: { "x-request-id": requestId } });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /required|invalid|insufficient|not found|inactive|expired|limit/i.test(message) ? 400 : 500;
    console.warn("[Billing] request_failed", { requestId, organizationId: user.orgId, storeId: user.storeId, operation: "CREATE_SALE", errorCode: message, httpStatus: status, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: message, requestId }, { status, headers: { "x-request-id": requestId } });
  }
}
