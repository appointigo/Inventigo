import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { sendInvoiceDeliveryDebug } from "@/modules/billing/services/whatsappInvoiceService";

type SendInvoiceRequest = {
  saleId: string;
};

export const POST = async (request: NextRequest) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.storeId) {
    return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
  }

  let body: SendInvoiceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.saleId) {
    return NextResponse.json({ error: "Missing required saleId" }, { status: 400 });
  }

  const sale = await prisma.sale.findUnique({
    where: { id: body.saleId },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      finalPayableAmount: true,
      total: true,
      transactionDate: true,
      createdAt: true,
      storeId: true,
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  if (sale.storeId !== user.storeId) {
    return NextResponse.json({ error: "Sale does not belong to the authenticated store" }, { status: 403 });
  }

  const store = await prisma.store.findUnique({
    where: { id: sale.storeId },
    select: { name: true, orgId: true },
  });

  if (!store || store.orgId !== user.orgId) {
    return NextResponse.json({ error: "Invalid store or organization" }, { status: 403 });
  }

  try {
    const payload = {
      orgId: user.orgId,
      storeId: sale.storeId,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerEmail: sale.customerEmail,
      amount: Number(sale.finalPayableAmount ?? sale.total ?? 0),
      currency: "INR",
      saleDate: sale.transactionDate ?? sale.createdAt,
      storeName: store.name,
    };

    const result = await sendInvoiceDeliveryDebug(payload);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
