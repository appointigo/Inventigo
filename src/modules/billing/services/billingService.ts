import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { CreateSaleInput, Sale, SaleItem, SaleFilters, SaleSummary } from "../types";
import { customerService } from "@/modules/customers/services/customerService";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const generateInvoiceNumber = async (storeId: string, attempt = 0): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const storeToken = storeId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const prefix = `INV-${dateStr}-${storeToken}-`;
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const latest = await prisma.sale.findFirst({
    where: {
      storeId,
      createdAt: { gte: startOfDay, lt: endOfDay },
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });
  const latestSeq = Number(latest?.invoiceNumber.split("-").at(-1) ?? "0");
  let nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;

  // On retry attempts, add a random suffix to avoid race-condition duplicates
  if (attempt > 0) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    nextSeq = (nextSeq * 1000) + randomSuffix;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
};

const isInvoiceNumberConflict = (error: unknown, depth = 0): boolean => {
  // Prisma wraps errors inside transactions. Recursively check nested
  // causes. Be permissive: treat P2002 or any message/meta mentioning
  // invoiceNumber as a conflict.
  if (depth > 5) return false; // Prevent infinite recursion

  const e = error as any;

  // Check common code locations
  const code = e?.code ?? e?.errorCode ?? e?.error?.code ?? undefined;
  if (code === "P2002") return true;

  // Check explicit meta/target fields
  const target = e?.meta?.target ?? e?.meta ?? e?.target;
  if (target) {
    const t = Array.isArray(target) ? target.join(" ") : String(target);
    if (t.includes("invoiceNumber")) return true;
  }

  // Check error message for invoiceNumber or unique constraint
  const msg = String(e?.message ?? e ?? "");
  if (msg.includes("invoiceNumber") || msg.includes("referenceNumber") || msg.includes("Unique constraint failed")) return true;

  // Recursively check nested cause (errors wrapped inside transactions)
  if (e?.cause) {
    if (isInvoiceNumberConflict(e.cause, depth + 1)) return true;
  }

  // Also check originalError
  if (e?.originalError) {
    if (isInvoiceNumberConflict(e.originalError, depth + 1)) return true;
  }

  // Last resort: stringify and search
  try {
    const json = JSON.stringify(e);
    if (json.includes("invoiceNumber")) return true;
  } catch (err) {
    // ignore stringify errors
  }

  return false;
};

const generateReturnReferenceNumber = async (storeId: string, attempt = 0): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const storeToken = storeId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const prefix = `RET-${dateStr}-${storeToken}-`;
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const latest = await prisma.returnTransaction.findFirst({
    where: {
      storeId,
      createdAt: { gte: startOfDay, lt: endOfDay },
      referenceNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { referenceNumber: true },
  });
  const latestSeq = Number(latest?.referenceNumber?.split("-").at(-1) ?? "0");
  let nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;

  if (attempt > 0) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    nextSeq = (nextSeq * 1000) + randomSuffix;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSaleDto = (s: any): Sale => ({
  id: s.id,
  invoiceNumber: s.invoiceNumber,
  customerId: s.customerId ?? null,
  customerName: s.customerName ?? null,
  customerPhone: s.customerPhone ?? null,
  customerEmail: s.customerEmail ?? null,
  subtotal: Number(s.subtotal),
  discountAmount: Number(s.discountAmount),
  taxAmount: Number(s.taxAmount),
  total: Number(s.total),
  amountPaid: Number(s.amountPaid ?? 0),
  amountDue: Number(s.amountDue ?? 0),
  paymentMethod: s.paymentMethod as Sale["paymentMethod"],
  paymentStatus: s.paymentStatus as Sale["paymentStatus"],
  returnStatus: s.returnStatus as Sale["returnStatus"],
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
  returnTransactions: (s.returnTransactions ?? []).map((rt: any) => {
    const items = rt.items ?? [];
    const returnedItems = items
      .filter((it: any) => it.returnedProductId)
      .map((item: any) => ({
        productId: String(item.returnedProductId),
        sizeId: String(item.returnedSizeId),
        quantity: Number(item.returnedQuantity),
        total: Number(item.returnedUnitPrice ?? 0) * Number(item.returnedQuantity ?? 0),
        productName: item.productName ?? undefined,
        sku: item.sku ?? undefined,
        sizeLabel: item.sizeLabel ?? undefined,
      }));

    const exchangedItems = items
      .filter((it: any) => it.newProductId)
      .map((item: any) => ({
        productId: String(item.newProductId),
        sizeId: String(item.newSizeId),
        quantity: Number(item.newQuantity),
        total: Number(item.newUnitPrice ?? 0) * Number(item.newQuantity ?? 0),
        productName: item.productName ?? undefined,
        sku: item.sku ?? undefined,
        sizeLabel: item.sizeLabel ?? undefined,
      }));

    return {
      id: rt.id,
      type: rt.type,
      returnedItems,
      exchangedItems,
      netAmount: Number(rt.netAmount),
      offsetAmount: Number(rt.offsetAmount),
      refundAmount: Number(rt.refundAmount),
      refundMethod: rt.refundMethod ?? undefined,
      reason: rt.reason ?? undefined,
      condition: rt.condition ?? undefined,
      notes: rt.notes ?? undefined,
      createdAt: rt.createdAt instanceof Date ? rt.createdAt.toISOString() : rt.createdAt,
    };
  }),
  transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
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
    if (!input.customerPhone?.trim()) {
      throw new Error("Customer mobile number is required");
    }

    const subtotal = input.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    const customer = await customerService.getOrCreateCustomer(
      orgId,
      input.customerPhone,
      input.customerName,
      input.customerEmail
    );

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
    const amountPaid = Math.max(0, input.amountPaid ?? total);
    const amountDue = Math.max(total - amountPaid, 0);
    const paymentStatus = amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING";

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const invoiceNumber = await generateInvoiceNumber(storeId, attempt - 1);

      try {
        const sale = await prisma.$transaction(async (tx) => {
          const created = await tx.sale.create({
            data: {
              storeId,
              invoiceNumber,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.mobile,
              customerEmail: customer.email,
              subtotal,
              discountAmount,
              taxAmount: input.taxAmount,
              total,
              amountPaid,
              amountDue,
              paymentMethod: input.paymentMethod,
              paymentStatus,
              status: "COMPLETED",
              createdBy: userId,
              transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
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
              payments: amountPaid > 0 ? {
                create: {
                  amount: amountPaid,
                  method: input.paymentMethod,
                  createdBy: userId,
                },
              } : undefined,
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

          const visitDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              lastVisitAt: visitDate,
              totalSpent: { increment: total },
              totalVisits: { increment: 1 },
            },
          });

          return created;
        });

        return toSaleDto(sale);
      } catch (error) {
        if (attempt < 5 && isInvoiceNumberConflict(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Could not generate a unique invoice number. Please retry.");
  },

  async getSaleById(orgId: string, id: string): Promise<Sale | null> {
    const sale = await prisma.sale.findFirst({
      where: { id, store: { orgId } },
      include: { ...saleInclude, payments: true, returnTransactions: { include: { items: true } } },
    });

    if (!sale) {
      return null;
    }

    const returnTransactions = (sale.returnTransactions ?? []) as any[];
    const historyItems = returnTransactions.flatMap((rt: any) => (rt.items ?? []));

    const productIds = [...new Set(historyItems.flatMap((item: any) => [item.returnedProductId, item.newProductId].filter(Boolean).map(String)))];
    const sizeIds = [...new Set(historyItems.flatMap((item: any) => [item.returnedSizeId, item.newSizeId].filter(Boolean).map(String)))];

    const [products, sizes] = await Promise.all([
      productIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true },
          })
        : [],
      sizeIds.length > 0
        ? prisma.size.findMany({
            where: { id: { in: sizeIds } },
            select: { id: true, label: true },
          })
        : [],
    ]);

    const productMap = Object.fromEntries(products.map((product) => [product.id, product]));
    const sizeMap = Object.fromEntries(sizes.map((size) => [size.id, size.label]));

    const saleWithHistory = {
      ...sale,
      returnTransactions: returnTransactions.map((rt: any) => {
        const items = rt.items ?? [];
        const returnedItems = items
          .filter((it: any) => it.returnedProductId)
          .map((item: any) => ({
            productId: String(item.returnedProductId),
            sizeId: String(item.returnedSizeId),
            quantity: Number(item.returnedQuantity),
            total: Number(item.returnedUnitPrice ?? 0) * Number(item.returnedQuantity ?? 0),
            productName: productMap[String(item.returnedProductId)]?.name ?? undefined,
            sku: productMap[String(item.returnedProductId)]?.sku ?? undefined,
            sizeLabel: sizeMap[String(item.returnedSizeId)] ?? undefined,
          }));

        const exchangedItems = items
          .filter((it: any) => it.newProductId)
          .map((item: any) => ({
            productId: String(item.newProductId),
            sizeId: String(item.newSizeId),
            quantity: Number(item.newQuantity),
            total: Number(item.newUnitPrice ?? 0) * Number(item.newQuantity ?? 0),
            productName: productMap[String(item.newProductId)]?.name ?? undefined,
            sku: productMap[String(item.newProductId)]?.sku ?? undefined,
            sizeLabel: sizeMap[String(item.newSizeId)] ?? undefined,
          }));

        return {
          ...rt,
          returnedItems,
          exchangedItems,
        };
      }),
    };

    return toSaleDto(saleWithHistory);
  },

  async getSales(orgId: string, filters?: SaleFilters): Promise<any[]> {
    console.log("billingService.getSales called", { orgId, filters });
    try {
      // proceed
    } catch (err) {
      console.error("billingService.getSales error:", err);
      throw err;
    }
    // Build sale query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saleWhere: any = { store: { orgId } };
    if (filters?.status) saleWhere.status = filters.status;
    if (filters?.paymentMethod) saleWhere.paymentMethod = filters.paymentMethod;
    if (filters?.startDate) saleWhere.createdAt = { ...(saleWhere.createdAt ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      saleWhere.createdAt = { ...(saleWhere.createdAt ?? {}), lt: end };
    }

    if (filters?.search) {
      saleWhere.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Build return transaction query
    const rtWhere: any = { store: { orgId } };
    if (filters?.startDate) rtWhere.createdAt = { ...(rtWhere.createdAt ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      rtWhere.createdAt = { ...(rtWhere.createdAt ?? {}), lt: end };
    }

    if (filters?.search) {
      rtWhere.OR = [
        { referenceNumber: { contains: filters.search, mode: "insensitive" } },
        { sale: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
        { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Apply type filter constraints on return transactions when requested
    if (filters?.type === "EXCHANGE") rtWhere.type = "EXCHANGE";
    if (filters?.type === "RETURN") rtWhere.type = { in: ["RETURN", "RETURN_EXCHANGE"] };

    // Fetch rows
    const [sales, returnTxns] = await Promise.all([
      prisma.sale.findMany({
        where: saleWhere,
        include: { items: { include: { product: true, size: true } }, customer: true, payments: { include: { user: { select: { name: true } } } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.returnTransaction.findMany({
        where: rtWhere,
        include: {
          items: { include: { returnedProduct: true, returnedSize: true, newProduct: true, newSize: true } },
          sale: { select: { invoiceNumber: true, id: true } },
          customer: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Map to unified rows
    const salesRows = sales.map((s) => ({
      ...s,
      rowType: "SALE",
      transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      userName: s.user?.name ?? null,
    }));

    const rtRows = returnTxns.map((r) => ({
      ...r,
      rowType: "RETURN_TRANSACTION",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      saleInvoiceNumber: r.sale?.invoiceNumber ?? undefined,
      customerName: r.customer?.name ?? null,
      userName: r.user?.name ?? null,
    }));

    let unified = [
      ...salesRows,
      ...rtRows,
    ];

    // Apply top-level type filter (if user explicitly asked for SALES only)
    if (filters?.type === "SALE") {
      unified = unified.filter((r) => r.rowType === "SALE");
    }

    // If user asked for only EXCHANGE rows (return transactions of type EXCHANGE)
    if (filters?.type === "EXCHANGE") {
      unified = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && r.type === "EXCHANGE");
    }

    // If user asked for RETURNS only, include RETURN and RETURN_EXCHANGE rows
    if (filters?.type === "RETURN") {
      unified = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && (r.type === "RETURN" || r.type === "RETURN_EXCHANGE"));
    }

    // Sort by createdAt desc
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return unified;
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
        data: {
          status: "REFUNDED",
          returnStatus: "FULL",
          amountDue: 0,
        },
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

      if (existing.customerId) {
        const spend = await tx.sale.aggregate({
          where: {
            customerId: existing.customerId,
            status: "COMPLETED",
            store: { orgId },
          },
          _sum: { total: true },
        });

        const visits = await tx.sale.count({
          where: {
            customerId: existing.customerId,
            status: "COMPLETED",
            store: { orgId },
          },
        });

        const latestCompletedSale = await tx.sale.findFirst({
          where: {
            customerId: existing.customerId,
            status: "COMPLETED",
            store: { orgId },
          },
          orderBy: { transactionDate: "desc" },
          select: { transactionDate: true },
        });

        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            totalSpent: Number(spend._sum.total ?? 0),
            totalVisits: visits,
            lastVisitAt: latestCompletedSale?.transactionDate ?? null,
          },
        });
      }

      return sale;
    });

    return toSaleDto(updated);
  },

  async recordSalePayment(
    orgId: string,
    saleId: string,
    userId: string,
    input: { amount: number; method: string; note?: string }
  ) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, store: { orgId } },
    });
    if (!sale || sale.status !== "COMPLETED") {
      throw new Error("Sale not found or not eligible for payment updates");
    }
    if (sale.paymentStatus === "PAID") {
      throw new Error("This sale is already fully paid");
    }
    if (input.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }
    const currentAmountDue = Number(sale.amountDue ?? 0);
    if (input.amount > currentAmountDue) {
      throw new Error(`Payment cannot exceed outstanding balance of ₹${currentAmountDue.toFixed(2)}`);
    }

    const amountPaid = Number(sale.amountPaid ?? 0) + input.amount;
    const amountDue = Math.max(Number(sale.total) - amountPaid, 0);
    const paymentStatus = amountPaid >= Number(sale.total) ? "PAID" : "PARTIAL";

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salePayment.create({
        data: {
          saleId,
          amount: input.amount,
          method: input.method as any,
          note: input.note,
          createdBy: userId,
        },
      });

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          amountPaid: { increment: input.amount },
          amountDue,
          paymentStatus,
        },
        include: {
          items: { include: { product: true, size: true } },
          customer: true,
          payments: { include: { user: { select: { name: true } } }, orderBy: { paidAt: "desc" } },
          user: { select: { name: true } },
        },
      });

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { totalSpent: { increment: input.amount } },
        });
      }

      return updatedSale;
    });

    return toSaleDto(updated);
  },

  async createReturnTransaction(
    orgId: string,
    saleId: string,
    userId: string,
    input: {
      type: string;
      returnedItems: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      exchangedItems?: Array<{ productId: string; sizeId: string; quantity: number; total: number }>;
      refundAmount: number;
      offsetAmount?: number;
      refundMethod?: string;
      reason?: string;
      condition?: string;
      notes?: string;
    }
  ) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, store: { orgId } },
      include: { items: true },
    });
    if (!sale) {
      throw new Error("Sale not found");
    }
    if (sale.status !== "COMPLETED") {
      throw new Error("Only completed sales can be returned or exchanged");
    }

    const exchangeWindowMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - sale.createdAt.getTime() > exchangeWindowMs) {
      throw new Error("Exchange/return window has expired for this sale");
    }

    const saleItemsByKey = new Map<string, typeof sale.items[number]>();
    for (const item of sale.items) {
      saleItemsByKey.set(`${item.productId}:${item.sizeId}`, item);
    }

    const returnedQty = input.returnedItems.reduce((sum, item) => sum + item.quantity, 0);
    for (const item of input.returnedItems) {
      const key = `${item.productId}:${item.sizeId}`;
      const existingSaleItem = saleItemsByKey.get(key);
      if (!existingSaleItem) {
        throw new Error(`Returned item not found in original sale: ${item.productId} / ${item.sizeId}`);
      }
      if (item.quantity <= 0 || item.quantity > existingSaleItem.quantity) {
        throw new Error(`Invalid returned quantity for item ${item.productId} / ${item.sizeId}`);
      }
    }

    for (const item of input.exchangedItems ?? []) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid exchanged quantity for item ${item.productId} / ${item.sizeId}`);
      }
    }

    const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const returnStatus = returnedQty >= totalQty ? "FULL" : "PARTIAL";
    const returnedTotal = input.returnedItems.reduce((sum, item) => sum + item.total, 0);
    const exchangedTotal = input.exchangedItems?.reduce((sum, item) => sum + item.total, 0) ?? 0;
    const netAmount = exchangedTotal - returnedTotal;
    const offsetAmount = returnedTotal;
    const refundAmount = Math.max(returnedTotal - exchangedTotal, 0);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const referenceNumber = await generateReturnReferenceNumber(sale.storeId, attempt - 1);

      try {
        const transaction = await prisma.$transaction(async (tx) => {
          const returnTransaction = await tx.returnTransaction.create({
            data: {
              referenceNumber,
              originalSaleId: saleId,
              storeId: sale.storeId,
              customerId: sale.customerId ?? undefined,
              type: input.type as any,
              netAmount: new Prisma.Decimal(netAmount),
              offsetAmount: new Prisma.Decimal(offsetAmount),
              refundAmount: new Prisma.Decimal(refundAmount),
              refundMethod: input.refundMethod,
              reason: input.reason,
              condition: input.condition,
              notes: input.notes,
              createdBy: userId,
              items: {
                create: [
                  ...input.returnedItems.map((ri) => ({
                    returnedProductId: ri.productId,
                    returnedSizeId: ri.sizeId,
                    returnedQuantity: ri.quantity,
                    returnedUnitPrice: new Prisma.Decimal(Number(ri.total) / (ri.quantity || 1)),
                  })),
                  ...(input.exchangedItems ?? []).map((ei) => ({
                    returnedQuantity: 0,
                    returnedUnitPrice: new Prisma.Decimal(0),
                    newProductId: ei.productId,
                    newSizeId: ei.sizeId,
                    newQuantity: ei.quantity,
                    newUnitPrice: new Prisma.Decimal(Number(ei.total) / (ei.quantity || 1)),
                  })),
                ],
              },
            },
          });

          if (netAmount > 0) {
            if (!input.refundMethod) {
              throw new Error("Payment method is required for exchange top-up");
            }
            await tx.salePayment.create({
              data: {
                saleId,
                amount: netAmount,
                method: input.refundMethod as any,
                note: `Exchange top-up payment for ${returnTransaction.id}`,
                createdBy: userId,
              },
            });
          }

          if (refundAmount > 0) {
            if (!input.refundMethod) {
              throw new Error("Refund method is required for return refunds");
            }
            await tx.salePayment.create({
              data: {
                saleId,
                amount: -refundAmount,
                method: input.refundMethod as any,
                note: `Refund for return ${returnTransaction.id}`,
                createdBy: userId,
              },
            });
          }

          if (sale.customerId) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                totalSpent: { increment: netAmount },
              },
            });
          }

          const isExchangeFlow = (input.exchangedItems?.length ?? 0) > 0;

          for (const item of input.returnedItems) {
            const stockEntry = await tx.stockEntry.findUnique({
              where: {
                productId_sizeId_storeId: {
                  productId: item.productId,
                  sizeId: item.sizeId,
                  storeId: sale.storeId,
                },
              },
            });
            if (!stockEntry) {
              throw new Error(`Stock entry not found for returned item ${item.productId} / ${item.sizeId}`);
            }

            await tx.stockEntry.update({
              where: {
                productId_sizeId_storeId: {
                  productId: item.productId,
                  sizeId: item.sizeId,
                  storeId: sale.storeId,
                },
              },
              data: { quantity: { increment: item.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                sizeId: item.sizeId,
                storeId: sale.storeId,
                type: isExchangeFlow ? "EXCHANGE_IN" : "RETURN",
                quantity: item.quantity,
                reason: `Return for sale ${sale.invoiceNumber}`,
                referenceType: isExchangeFlow ? "EXCHANGE" : "RETURN",
                referenceId: returnTransaction.id,
                createdBy: userId,
              },
            });
          }

          for (const item of input.exchangedItems ?? []) {
            const entry = await tx.stockEntry.findUnique({
              where: {
                productId_sizeId_storeId: {
                  productId: item.productId,
                  sizeId: item.sizeId,
                  storeId: sale.storeId,
                },
              },
            });
            if (!entry || entry.quantity < item.quantity) {
              throw new Error(
                `Insufficient stock for exchange item ${item.productId} size ${item.sizeId}`
              );
            }

            await tx.stockEntry.update({
              where: {
                productId_sizeId_storeId: {
                  productId: item.productId,
                  sizeId: item.sizeId,
                  storeId: sale.storeId,
                },
              },
              data: { quantity: { decrement: item.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                sizeId: item.sizeId,
                storeId: sale.storeId,
                type: "EXCHANGE_OUT",
                quantity: item.quantity,
                reason: `Exchange for sale ${sale.invoiceNumber}`,
                referenceType: "EXCHANGE",
                referenceId: returnTransaction.id,
                createdBy: userId,
              },
            });
          }

          const saleStatus =
            input.type === "RETURN"
              ? returnStatus === "FULL"
                ? "REFUNDED"
                : sale.status
              : "EXCHANGED";

          await tx.sale.update({
            where: { id: saleId },
            data: {
              returnStatus,
              status: saleStatus,
            },
          });

          return returnTransaction;
        });

        return transaction;
      } catch (error) {
        if (attempt < 5 && isInvoiceNumberConflict(error)) {
          // Retry on reference/invoice unique conflicts
          continue;
        }
        throw error;
      }
    }
  },

  async getSalesKPIs(orgId: string): Promise<{
    totalCollected: number;
    totalCollectedLastMonth: number;
    growthPercent: number;
    exchangeCount: number;
    exchangesFlaggedForReview: number;
    refundCount: number;
    refundGrowthPercent: number;
    amountReceivable: number;
    receivableCustomerCount: number;
    pendingRefundAmount: number;
    pendingRefundCount: number;
  }> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Previous month
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Fetch all data in parallel
    const [
      thisMonthPayments,
      prevMonthPayments,
      receivables,
      partialSalesByCustomer,
      allExchanges,
      allRefunds,
      thisMonthRefunds,
      prevMonthRefunds,
      pendingRefunds,
      pendingRefundCount,
    ] = await Promise.all([
      prisma.salePayment.aggregate({
        where: { paidAt: { gte: startOfMonth, lte: endOfMonth }, sale: { store: { orgId } } },
        _sum: { amount: true },
      }),
      prisma.salePayment.aggregate({
        where: { paidAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }, sale: { store: { orgId } } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { store: { orgId }, status: "COMPLETED", paymentStatus: "PARTIAL" },
        _sum: { amountDue: true },
      }),
      prisma.sale.groupBy({
        by: ["customerId"],
        where: { store: { orgId }, status: "COMPLETED", paymentStatus: "PARTIAL" },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, type: "EXCHANGE" },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, refundAmount: { gt: 0 } },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, createdAt: { gte: startOfMonth, lte: endOfMonth }, refundAmount: { gt: 0 } },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }, refundAmount: { gt: 0 } },
      }),
      prisma.returnTransaction.aggregate({
        where: { store: { orgId }, refundAmount: { gt: 0 } },
        _sum: { refundAmount: true },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, refundAmount: { gt: 0 } },
      }),
    ]);

    const totalCollected = Number(thisMonthPayments._sum.amount ?? 0);
    const totalCollectedLastMonth = Number(prevMonthPayments._sum.amount ?? 0);
    const growthPercent =
      totalCollectedLastMonth === 0
        ? totalCollected > 0
          ? 100
          : 0
        : ((totalCollected - totalCollectedLastMonth) / totalCollectedLastMonth) * 100;

    const amountReceivable = Number(receivables._sum.amountDue ?? 0);
    const receivableCustomerCount = partialSalesByCustomer.length;

    const refundGrowthPercent =
      prevMonthRefunds === 0
        ? thisMonthRefunds > 0
          ? 100
          : 0
        : ((thisMonthRefunds - prevMonthRefunds) / prevMonthRefunds) * 100;

    const pendingRefundAmount = Number(pendingRefunds._sum.refundAmount ?? 0);

    return {
      totalCollected,
      totalCollectedLastMonth,
      growthPercent: Math.round(growthPercent * 100) / 100,
      exchangeCount: allExchanges,
      exchangesFlaggedForReview: 0, // To be implemented with review status field
      refundCount: allRefunds,
      refundGrowthPercent: Math.round(refundGrowthPercent * 100) / 100,
      amountReceivable,
      receivableCustomerCount,
      pendingRefundAmount,
      pendingRefundCount,
    };
  },

  async getSalesPaged(orgId: string, filters?: SaleFilters, page = 1, limit = 20) {
    // Build sale query
    const saleWhere: any = { store: { orgId } };
    if (filters?.status) saleWhere.status = filters.status;
    if (filters?.paymentMethod) saleWhere.paymentMethod = filters.paymentMethod;
    if (filters?.startDate) saleWhere.createdAt = { ...(saleWhere.createdAt ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      saleWhere.createdAt = { ...(saleWhere.createdAt ?? {}), lt: end };
    }

    if (filters?.search) {
      saleWhere.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Build return transaction query
    const rtWhere: any = { store: { orgId } };
    if (filters?.startDate) rtWhere.createdAt = { ...(rtWhere.createdAt ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      rtWhere.createdAt = { ...(rtWhere.createdAt ?? {}), lt: end };
    }

    if (filters?.search) {
      rtWhere.OR = [
        { referenceNumber: { contains: filters.search, mode: "insensitive" } },
        { sale: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
        { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    if (filters?.type === "EXCHANGE") rtWhere.type = "EXCHANGE";
    if (filters?.type === "RETURN") rtWhere.type = { in: ["RETURN", "RETURN_EXCHANGE"] };

    const [sales, returnTxns] = await Promise.all([
      prisma.sale.findMany({
        where: saleWhere,
        include: { items: { include: { product: true, size: true } }, customer: true, payments: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.returnTransaction.findMany({
        where: rtWhere,
        include: {
          items: { include: { returnedProduct: true, returnedSize: true, newProduct: true, newSize: true } },
          sale: { select: { invoiceNumber: true, id: true } },
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const salesRows = sales.map((s) => ({
      ...s,
      rowType: "SALE",
      transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    }));

    const rtRows = returnTxns.map((r) => ({
      ...r,
      rowType: "RETURN_TRANSACTION",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      saleInvoiceNumber: r.sale?.invoiceNumber ?? undefined,
      customerName: r.customer?.name ?? null,
    }));

    let unified = [...salesRows, ...rtRows];

    if (filters?.type === "SALE") {
      unified = unified.filter((r) => r.rowType === "SALE");
    }
    if (filters?.type === "EXCHANGE") {
      unified = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && r.type === "EXCHANGE");
    }
    if (filters?.type === "RETURN") {
      unified = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && (r.type === "RETURN" || r.type === "RETURN_EXCHANGE"));
    }

    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = unified.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = Math.max(0, (page - 1) * limit);
    const data = unified.slice(start, start + limit);

    const kpis = await this.getSalesKPIs(orgId);

    const exchangeCount = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && r.type === "EXCHANGE").length;
    const refundCount = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION" && Number(r.refundAmount ?? 0) > 0).length;
    const pendingRefundAmount = unified.filter((r: any) => r.rowType === "RETURN_TRANSACTION").reduce((s: number, r: any) => s + Number(r.refundAmount ?? 0), 0);

    return {
      data,
      pagination: { page, limit, total, totalPages },
      stats: {
        totalCollected: kpis.totalCollected,
        amountReceivable: kpis.amountReceivable,
        exchangeCount: kpis.exchangeCount,
        refundCount: kpis.refundCount,
        pendingRefundAmount: kpis.pendingRefundAmount,
      },
    };
  },
};

