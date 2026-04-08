import { prisma } from "@/lib/db";
import type { CreateSaleInput, Sale, SaleItem, SaleFilters, SaleSummary } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const generateInvoiceNumber = async (storeId: string): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const count = await prisma.sale.count({
    where: { storeId, createdAt: { gte: startOfDay, lt: endOfDay } },
  });

  return `INV-${dateStr}-${String(count + 1).padStart(4, "0")}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSaleDto = (s: any): Sale => ({
  id: s.id,
  invoiceNumber: s.invoiceNumber,
  customerName: s.customerName ?? null,
  customerPhone: s.customerPhone ?? null,
  customerEmail: s.customerEmail ?? null,
  subtotal: Number(s.subtotal),
  discountAmount: Number(s.discountAmount),
  taxAmount: Number(s.taxAmount),
  total: Number(s.total),
  paymentMethod: s.paymentMethod as Sale["paymentMethod"],
  status: s.status as Sale["status"],
  items: (s.items ?? []).map((i: any): SaleItem => ({
    id: i.id,
    productId: i.productId,
    productName: i.product?.name ?? "",
    sku: i.product?.sku ?? "",
    sizeId: i.sizeId,
    sizeLabel: i.size?.label ?? "",
    attributes: (i.product?.attributes as Record<string, unknown>) ?? {},
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    total: Number(i.total),
  })),
  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
});

const saleInclude = {
  items: {
    include: {
      product: { select: { name: true, sku: true, attributes: true } },
      size: { select: { label: true } },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const billingService = {
  async createSale(
    orgId: string,
    storeId: string,
    userId: string,
    input: CreateSaleInput
  ): Promise<Sale> {
    const subtotal = input.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    // Server-side promo validation — never trust client discountAmount when a promo is applied
    let discountAmount = input.discountAmount;
    let resolvedPromoCodeId: string | null = null;

    if (input.promoCodeId) {
      const promo = await prisma.promoCode.findFirst({
        where: { id: input.promoCodeId, orgId },
      });

      if (!promo) {
        throw new Error("Promo code not found");
      }
      if (!promo.isActive) {
        throw new Error("Promo code is inactive");
      }
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        throw new Error("Promo code has expired");
      }
      if (promo.maxUses !== null && promo.usageCount >= promo.maxUses) {
        throw new Error("Promo code usage limit reached");
      }

      // Recompute discount server-side from promo.discountPct
      discountAmount = Math.round(subtotal * Number(promo.discountPct)) / 100;
      resolvedPromoCodeId = promo.id;
    }

    const total = subtotal - discountAmount + input.taxAmount;
    const invoiceNumber = await generateInvoiceNumber(storeId);

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          storeId,
          invoiceNumber,
          customerName: input.customerName ?? null,
          customerPhone: input.customerPhone ?? null,
          customerEmail: input.customerEmail ?? null,
          subtotal,
          discountAmount,
          taxAmount: input.taxAmount,
          total,
          paymentMethod: input.paymentMethod,
          status: "COMPLETED",
          createdBy: userId,
          promoCodeId: resolvedPromoCodeId,
          items: {
            create: input.items.map((it) => ({
              productId: it.productId,
              sizeId: it.sizeId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.unitPrice * it.quantity,
            })),
          },
        },
        include: saleInclude,
      });

      // Atomically increment promo usageCount
      if (resolvedPromoCodeId) {
        await tx.promoCode.update({
          where: { id: resolvedPromoCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Decrement stock for each sold item (with availability check + audit records)
      for (const it of input.items) {
        const entry = await tx.stockEntry.findUnique({
          where: { productId_sizeId_storeId: { productId: it.productId, sizeId: it.sizeId, storeId } },
        });

        if (!entry || entry.quantity < it.quantity) {
          throw new Error(
            `Insufficient stock: only ${entry?.quantity ?? 0} available for size ${it.sizeId}`
          );
        }

        await tx.stockEntry.update({
          where: { productId_sizeId_storeId: { productId: it.productId, sizeId: it.sizeId, storeId } },
          data: { quantity: { decrement: it.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            sizeId: it.sizeId,
            storeId,
            type: "SALE",
            quantity: it.quantity,
            reason: `Sale ${invoiceNumber}`,
            referenceType: "SALE",
            referenceId: created.id,
            createdBy: userId,
          },
        });
      }

      return created;
    });

    return toSaleDto(sale);
  },

  async getSaleById(orgId: string, id: string): Promise<Sale | null> {
    const sale = await prisma.sale.findFirst({
      where: { id, store: { orgId } },
      include: saleInclude,
    });

    return sale ? toSaleDto(sale) : null;
  },

  async getSales(orgId: string, filters?: SaleFilters): Promise<SaleSummary[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { store: { orgId } };
    if (filters?.status) where.status = filters.status;
    if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters?.startDate) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { ...(where.createdAt ?? {}), lt: end };
    }
    
    if (filters?.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });

    return sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName ?? null,
      total: Number(s.total),
      paymentMethod: s.paymentMethod as Sale["paymentMethod"],
      status: s.status as Sale["status"],
      itemCount: s._count.items,
      createdAt: s.createdAt.toISOString(),
    }));
  },

  async refundSale(orgId: string, saleId: string): Promise<Sale | null> {
    const existing = await prisma.sale.findFirst({
      where: { id: saleId, store: { orgId } },
      include: saleInclude,
    });
    if (!existing || existing.status === "REFUNDED") return null;

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.update({
        where: { id: saleId },
        data: { status: "REFUNDED" },
        include: saleInclude,
      });

      // Restore stock for each item + create audit records
      for (const it of existing.items) {
        await tx.stockEntry.updateMany({
          where: { productId: it.productId, sizeId: it.sizeId, storeId: existing.storeId },
          data: { quantity: { increment: it.quantity } },
        });
        
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            sizeId: it.sizeId,
            storeId: existing.storeId,
            type: "RETURN",
            quantity: it.quantity,
            reason: `Refund for sale ${existing.invoiceNumber}`,
            referenceType: "SALE",
            referenceId: saleId,
            createdBy: existing.createdBy,
          },
        });
      }

      return sale;
    });

    return toSaleDto(updated);
  },

  async getSalesKPIs(orgId: string): Promise<{
    todaySales: number;
    todayRevenue: number;
    totalSales: number;
    totalRevenue: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const [todayRows, allRows] = await Promise.all([
      prisma.sale.findMany({
        where: { store: { orgId }, status: "COMPLETED", createdAt: { gte: startOfDay, lt: endOfDay } },
        select: { total: true },
      }),
      prisma.sale.findMany({
        where: { store: { orgId }, status: "COMPLETED" },
        select: { total: true },
      }),
    ]);

    return {
      todaySales: todayRows.length,
      todayRevenue: todayRows.reduce((s, r) => s + Number(r.total), 0),
      totalSales: allRows.length,
      totalRevenue: allRows.reduce((s, r) => s + Number(r.total), 0),
    };
  },
};

