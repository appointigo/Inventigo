import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { sendInvoiceDeliveryDebug } from "@/modules/billing/services/whatsappInvoiceService";
import type { InvoiceNotificationPayload } from "@/modules/billing/services/whatsappInvoiceService";

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
      customer: {
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
        },
      },
      finalPayableAmount: true,
      total: true,
      transactionDate: true,
      createdAt: true,
      storeId: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              attributes: true,
              brand: { select: { name: true } },
              category: { select: { name: true } },
            },
          },
          size: { select: { label: true } },
        },
      },
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
    const payload: InvoiceNotificationPayload = {
      orgId: user.orgId,
      storeId: sale.storeId,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customer?.name ?? sale.customerName,
      customerPhone: sale.customer?.mobile ?? null,
      customerEmail: sale.customer?.email ?? sale.customerEmail,
      amount: Number(sale.finalPayableAmount ?? sale.total ?? 0),
      currency: "INR",
      saleDate: sale.transactionDate ?? sale.createdAt,
      storeName: store.name,
      items: (sale.items ?? []).map((item) => {
        const attributes = (item.product?.attributes as Record<string, unknown>) ?? {};
        return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "",
          sku: item.product?.sku ?? "",
          sizeId: item.sizeId,
          sizeLabel: item.size?.label ?? "",
          attributes,
          description: typeof attributes.description === "string" ? attributes.description : undefined,
          brandName: item.product?.brand?.name ?? undefined,
          categoryName: item.product?.category?.name ?? undefined,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          mrp: item.mrp != null ? Number(item.mrp) : Number(item.unitPrice),
          sellingPrice: item.sellingPrice != null ? Number(item.sellingPrice) : Number(item.unitPrice),
          discountType: item.discountType ?? undefined,
          appliedDiscountPercent: item.appliedDiscountPercent != null ? Number(item.appliedDiscountPercent) : undefined,
          allocatedDiscount: item.allocatedDiscount != null ? Number(item.allocatedDiscount) : undefined,
          taxableAmount: item.taxableAmount != null ? Number(item.taxableAmount) : undefined,
          taxAmount: item.taxAmount != null ? Number(item.taxAmount) : undefined,
          finalUnitPrice: item.finalUnitPrice != null ? Number(item.finalUnitPrice) : Number(item.unitPrice),
          finalLineAmount: item.finalLineAmount != null ? Number(item.finalLineAmount) : Number(item.total),
          effectiveUnitPrice: item.effectiveUnitPrice != null ? Number(item.effectiveUnitPrice) : Number(item.unitPrice),
          costPrice: item.costPrice != null ? Number(item.costPrice) : undefined,
          pricingSnapshotDate: item.pricingSnapshotDate instanceof Date ? item.pricingSnapshotDate.toISOString() : item.pricingSnapshotDate ?? undefined,
        };
      }),
    };

    const result = await sendInvoiceDeliveryDebug(payload);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
