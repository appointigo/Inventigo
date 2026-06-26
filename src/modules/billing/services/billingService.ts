import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { CreateSaleInput, Sale, SaleItem, SaleFilters, SaleSummary } from "../types";
import { customerService } from "@/modules/customers/services/customerService";
import { allocatePricingSnapshots } from "../utils/pricingEngine";

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

const EPSILON = 0.01;
const VALID_PAYMENT_METHODS = new Set(["CASH", "CARD", "UPI"]);

type NormalizedPaymentEntry = {
  method: "CASH" | "CARD" | "UPI";
  amount: number;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp0 = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

const derivePresentationPaymentMethod = (
  fallbackMethod: unknown,
  payments: Array<{ method?: string; amount?: unknown }> | undefined
): Sale["paymentMethod"] => {
  const nonZeroMethods = new Set(
    (payments ?? [])
      .filter((p) => Number(p.amount ?? 0) > 0)
      .map((p) => String(p.method ?? ""))
      .filter((m) => VALID_PAYMENT_METHODS.has(m))
  );

  if (nonZeroMethods.size > 1) {
    return "SPLIT";
  }

  if (nonZeroMethods.size === 1) {
    return [...nonZeroMethods][0] as Sale["paymentMethod"];
  }

  return (fallbackMethod as Sale["paymentMethod"]) ?? "CASH";
};

const normalizePaymentEntries = (
  splitPayments: Array<{ method?: string; amount?: number }> | undefined,
  fallbackMethod: string | undefined,
  fallbackAmount: number
): NormalizedPaymentEntry[] => {
  if (Array.isArray(splitPayments) && splitPayments.length > 0) {
    const normalized = splitPayments
      .map((entry) => ({
        method: String(entry?.method ?? "").toUpperCase(),
        amount: round2(Number(entry?.amount ?? 0)),
      }))
      .filter((entry) => entry.amount > 0);

    if (normalized.length === 0) {
      throw new Error("At least one split payment entry with amount is required");
    }

    for (const entry of normalized) {
      if (!VALID_PAYMENT_METHODS.has(entry.method)) {
        throw new Error(`Invalid payment method: ${entry.method}`);
      }
      if (entry.amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }
    }

    return normalized as NormalizedPaymentEntry[];
  }

  if (fallbackAmount <= 0) {
    return [];
  }

  const method = String(fallbackMethod ?? "CASH").toUpperCase();
  if (!VALID_PAYMENT_METHODS.has(method)) {
    throw new Error("Invalid payment method");
  }

  return [{ method: method as NormalizedPaymentEntry["method"], amount: round2(fallbackAmount) }];
};

const extractHistoricalUnitAmount = (item: any): number => {
  const effectiveUnit = Number(item?.effectiveUnitPrice ?? item?.finalUnitPrice ?? item?.sellingPrice ?? item?.unitPrice ?? 0);
  if (effectiveUnit > 0) {
    return round2(effectiveUnit);
  }

  const quantity = Math.max(1, Number(item?.quantity ?? 1));
  const lineTotal = Number(item?.finalLineAmount ?? item?.total ?? 0);
  return round2(lineTotal / quantity);
};

const getPrimaryPaymentMethod = (entries: NormalizedPaymentEntry[], fallbackMethod?: string): "CASH" | "CARD" | "UPI" => {
  if (entries.length === 0) {
    const method = String(fallbackMethod ?? "CASH").toUpperCase();
    return (VALID_PAYMENT_METHODS.has(method) ? method : "CASH") as "CASH" | "CARD" | "UPI";
  }

  const sorted = [...entries].sort((a, b) => b.amount - a.amount);
  return sorted[0].method;
};

async function hasTable(tableName: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_table: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
      ) AS has_table
    `;

    return result[0]?.has_table ?? false;
  } catch {
    return false;
  }
}

let supportsExchangedStatusCache: boolean | null = null;

async function supportsExchangedSaleStatus() {
  if (supportsExchangedStatusCache !== null) {
    return supportsExchangedStatusCache;
  }

  try {
    const result = await prisma.$queryRaw<Array<{ has_value: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'SaleStatus'
          AND e.enumlabel = 'EXCHANGED'
      ) AS has_value
    `;

    supportsExchangedStatusCache = result[0]?.has_value ?? false;
    return supportsExchangedStatusCache;
  } catch {
    supportsExchangedStatusCache = false;
    return false;
  }
}

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
  total: Number(s.finalPayableAmount ?? s.total),
  calculatedTotal: s.calculatedTotal != null ? Number(s.calculatedTotal) : undefined,
  roundOffAmount: Number(s.roundOffAmount ?? 0),
  finalPayableAmount: s.finalPayableAmount != null ? Number(s.finalPayableAmount) : undefined,
  amountPaid: Number(s.amountPaid ?? 0),
  amountDue: Number(s.amountDue ?? 0),
  paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments) as Sale["paymentMethod"],
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
    mrp: i.mrp != null ? Number(i.mrp) : Number(i.unitPrice),
    sellingPrice: i.sellingPrice != null ? Number(i.sellingPrice) : Number(i.unitPrice),
    discountType: i.discountType ?? undefined,
    appliedDiscountPercent: i.appliedDiscountPercent != null ? Number(i.appliedDiscountPercent) : undefined,
    allocatedDiscount: i.allocatedDiscount != null ? Number(i.allocatedDiscount) : undefined,
    taxableAmount: i.taxableAmount != null ? Number(i.taxableAmount) : undefined,
    taxAmount: i.taxAmount != null ? Number(i.taxAmount) : undefined,
    finalUnitPrice: i.finalUnitPrice != null ? Number(i.finalUnitPrice) : Number(i.unitPrice),
    finalLineAmount: i.finalLineAmount != null ? Number(i.finalLineAmount) : Number(i.total),
    effectiveUnitPrice: i.effectiveUnitPrice != null ? Number(i.effectiveUnitPrice) : Number(i.unitPrice),
    costPrice: i.costPrice != null ? Number(i.costPrice) : undefined,
    pricingSnapshotDate: i.pricingSnapshotDate instanceof Date ? i.pricingSnapshotDate.toISOString() : i.pricingSnapshotDate ?? undefined,
  })),
  payments: (s.payments ?? []).map((p: any) => ({
    id: p.id,
    saleId: p.saleId,
    amount: Number(p.amount),
    method: p.method,
    businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate,
    paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
    note: p.note ?? undefined,
    createdBy: p.createdBy,
  })),
  returnTransactions: (s.returnTransactions ?? []).map((rt: any) => {
    const relationalItems: any[] = rt.items ?? [];

    // ── Backward-compatibility: old return transactions (created before the
    // return_transaction_items relational table was introduced) store their
    // item lists as JSONB in returnedItems / exchangedItems columns.  When the
    // relational table is empty we fall back to those JSONB arrays so legacy
    // records render correctly.
    const legacyReturned: any[] = relationalItems.length === 0 && Array.isArray(rt.returnedItems)
      ? rt.returnedItems
      : [];
    const legacyExchanged: any[] = relationalItems.length === 0 && Array.isArray(rt.exchangedItems)
      ? rt.exchangedItems
      : [];

    const returnedItems = relationalItems.length > 0
      ? relationalItems
          .filter((it: any) => it.returnedProductId)
          .map((item: any) => ({
            productId: String(item.returnedProductId),
            sizeId: String(item.returnedSizeId ?? ""),
            quantity: Number(item.returnedQuantity),
            total: Number(item.returnedUnitPrice ?? 0) * Number(item.returnedQuantity ?? 0),
            productName: item.returnedProduct?.name ?? item.productName ?? undefined,
            sku: item.returnedProduct?.sku ?? item.sku ?? undefined,
            sizeLabel: item.returnedSize?.label ?? item.sizeLabel ?? undefined,
          }))
      : legacyReturned.map((item: any) => ({
          productId: String(item.productId ?? ""),
          sizeId: String(item.sizeId ?? ""),
          quantity: Number(item.quantity ?? 0),
          total: Number(item.total ?? 0),
          productName: undefined,
          sku: undefined,
          sizeLabel: undefined,
        }));

    const exchangedItems = relationalItems.length > 0
      ? relationalItems
          .filter((it: any) => it.newProductId)
          .map((item: any) => ({
            productId: String(item.newProductId),
            sizeId: String(item.newSizeId ?? ""),
            quantity: Number(item.newQuantity ?? 0),
            total: Number(item.newUnitPrice ?? 0) * Number(item.newQuantity ?? 0),
            productName: item.newProduct?.name ?? item.productName ?? undefined,
            sku: item.newProduct?.sku ?? item.sku ?? undefined,
            sizeLabel: item.newSize?.label ?? item.sizeLabel ?? undefined,
          }))
      : legacyExchanged.map((item: any) => ({
          productId: String(item.productId ?? ""),
          sizeId: String(item.sizeId ?? ""),
          quantity: Number(item.quantity ?? 0),
          total: Number(item.total ?? 0),
          productName: undefined,
          sku: undefined,
          sizeLabel: undefined,
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
  payments: true,
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
      discountAmount = Math.round((subtotal * Number(promo.discountPct)) / 100);
      resolvedPromoCodeId = promo.id;
    }

    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, mrp: true, costPrice: true },
        })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));
    const pricing = allocatePricingSnapshots(
      input.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          mrp: Number(product?.mrp ?? item.unitPrice),
          sellingPrice: Number(item.unitPrice),
          costPrice: product?.costPrice != null ? Number(product.costPrice) : undefined,
          eligibleForDiscount: true,
        };
      }),
      {
        discountType: input.discountType ?? "PERCENTAGE",
        discountPercent: input.discountPercent ?? 0,
        discountAmount,
        taxRate: input.taxRate ?? 0,
        taxMode: input.taxMode ?? "EXCLUSIVE",
        pricingSnapshotDate: transactionDate,
      }
    );

    discountAmount = pricing.discountAmount;
    const taxAmount = pricing.taxAmount;
    const calculatedTotal = pricing.total;

    // Compute round-off for retail billing
    const finalPayableAmount = Math.round(calculatedTotal);
    const roundOffAmount = round2(finalPayableAmount - calculatedTotal);

    let requestedAmountPaid = round2(Math.max(0, Number(input.amountPaid ?? finalPayableAmount)));
    const paymentEntries = normalizePaymentEntries(input.splitPayments, input.paymentMethod, requestedAmountPaid);
    let splitCollected = round2(paymentEntries.reduce((sum, entry) => sum + entry.amount, 0));

    const overpayment = round2(splitCollected - finalPayableAmount);
    const singleCashPaymentEntry = paymentEntries.length === 1 && paymentEntries[0].method === "CASH";

    if (overpayment > EPSILON) {
      if (singleCashPaymentEntry && overpayment <= 1) {
        // Accept minor cash tendering differences by clamping the recorded payment
        // to the invoice total. The actual cash drawer can handle the change.
        paymentEntries[0].amount = finalPayableAmount;
        splitCollected = finalPayableAmount;
        requestedAmountPaid = finalPayableAmount;
      } else {
        throw new Error(`Collected amount cannot exceed total invoice amount of ₹${finalPayableAmount.toFixed(2)}`);
      }
    }

    if (Math.abs(splitCollected - requestedAmountPaid) > EPSILON) {
      throw new Error("Split payment total must match amount paid");
    }

    const amountPaid = splitCollected;
    const amountDue = Math.max(finalPayableAmount - amountPaid, 0);
    const paymentStatus = amountPaid >= finalPayableAmount ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING";
    const primaryPaymentMethod = getPrimaryPaymentMethod(paymentEntries, input.paymentMethod);

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
              taxAmount,
              total: finalPayableAmount,
              calculatedTotal,
              roundOffAmount,
              finalPayableAmount,
              amountPaid,
              amountDue,
              paymentMethod: primaryPaymentMethod,
              paymentStatus,
              status: "COMPLETED",
              createdBy: userId,
              transactionDate,
              promoCodeId: resolvedPromoCodeId,
              items: {
                create: input.items.map((it, index) => {
                  const snapshot = pricing.snapshots[index];
                  return {
                    productId: it.productId,
                    sizeId: it.sizeId,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    total: it.unitPrice * it.quantity,
                    mrp: snapshot?.mrp ?? it.unitPrice,
                    sellingPrice: snapshot?.sellingPrice ?? it.unitPrice,
                    discountType: snapshot?.discountType ?? null,
                    appliedDiscountPercent: snapshot?.appliedDiscountPercent ?? null,
                    allocatedDiscount: snapshot?.allocatedDiscount ?? 0,
                    taxableAmount: snapshot?.taxableAmount ?? 0,
                    taxAmount: snapshot?.taxAmount ?? 0,
                    finalUnitPrice: snapshot?.finalUnitPrice ?? it.unitPrice,
                    finalLineAmount: snapshot?.finalLineAmount ?? it.unitPrice * it.quantity,
                    effectiveUnitPrice: snapshot?.effectiveUnitPrice ?? it.unitPrice,
                    costPrice: snapshot?.costPrice ?? null,
                    pricingSnapshotDate: snapshot?.pricingSnapshotDate ?? transactionDate,
                  };
                }),
              },
              payments: paymentEntries.length > 0
                ? {
                    create: paymentEntries.map((entry) => ({
                      amount: entry.amount,
                      method: entry.method,
                      businessDate: transactionDate,
                      createdBy: userId,
                    })),
                  }
                : undefined,
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
                movementDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
                createdBy: userId,
              },
            });
          }

          const visitDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              lastVisitAt: visitDate,
              totalSpent: { increment: finalPayableAmount },
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
    const hasReturnItemsTable = await hasTable("return_transaction_items");

    const sale = await prisma.sale.findFirst({
      where: { id, store: { orgId } },
      include: {
        ...saleInclude,
        payments: true,
        returnTransactions: hasReturnItemsTable
          ? {
              include: {
                items: {
                  include: {
                    returnedProduct: { select: { name: true, sku: true } },
                    returnedSize: { select: { label: true } },
                    newProduct: { select: { name: true, sku: true } },
                    newSize: { select: { label: true } },
                  },
                },
              },
            }
          : true,
      },
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
    const hasReturnItemsTable = await hasTable("return_transaction_items");

    const supportsExchangedStatus = await supportsExchangedSaleStatus();

    // Build sale query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saleWhere: any = { store: { orgId } };
    if (filters?.status) {
      if (filters.status === "EXCHANGED" && !supportsExchangedStatus) {
        // Legacy DBs may not have EXCHANGED in SaleStatus enum yet.
        // Degrade gracefully to COMPLETED instead of throwing P2007.
        saleWhere.status = "COMPLETED";
      } else {
        saleWhere.status = filters.status;
      }
    }
    if (filters?.paymentMethod) saleWhere.paymentMethod = filters.paymentMethod;

    // Date range filter: use transactionDate (canonical for backdated billing) with
    // an OR fallback to createdAt so records created before the transactionDate
    // migration (20260509000000) are still included.
    if (filters?.startDate || filters?.endDate) {
      const dateFilters: any[] = [];
      if (filters.startDate) {
        const from = new Date(filters.startDate);
        dateFilters.push({ transactionDate: { gte: from } });
        dateFilters.push({ createdAt: { gte: from } });
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        // Combine start + end into the same OR clause
        if (filters.startDate) {
          const from = new Date(filters.startDate);
          saleWhere.OR = [
            { transactionDate: { gte: from, lt: end } },
            { createdAt: { gte: from, lt: end } },
          ];
        } else {
          saleWhere.OR = [
            { transactionDate: { lt: end } },
            { createdAt: { lt: end } },
          ];
        }
      } else if (filters.startDate) {
        const from = new Date(filters.startDate);
        saleWhere.OR = [
          { transactionDate: { gte: from } },
          { createdAt: { gte: from } },
        ];
      }
    }

    if (filters?.search) {
      saleWhere.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Build return transaction query
    const rtWhere: any = { store: { orgId } };
    if (filters?.startDate) rtWhere.businessDate = { ...(rtWhere.businessDate ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      rtWhere.businessDate = { ...(rtWhere.businessDate ?? {}), lt: end };
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
        include: hasReturnItemsTable
          ? {
              items: {
                include: {
                  returnedProduct: { select: { name: true, sku: true } },
                  returnedSize: { select: { label: true } },
                  newProduct: { select: { name: true, sku: true } },
                  newSize: { select: { label: true } },
                },
              },
              sale: { select: { invoiceNumber: true, id: true } },
              customer: true,
              user: { select: { name: true } },
            }
          : {
              sale: { select: { invoiceNumber: true, id: true } },
              customer: true,
              user: { select: { name: true } },
            },
        orderBy: { businessDate: "desc" },
      }),
    ]);

    // Map to unified rows
    const salesRows = sales.map((s) => ({
      ...s,
      rowType: "SALE",
      paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments),
      payments: (s.payments ?? []).map((p: any) => ({
        ...p,
        amount: Number(p.amount ?? 0),
        businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
      })),
      transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      userName: s.user?.name ?? null,
    }));

    const rtRows = returnTxns.map((r) => ({
      ...r,
      rowType: "RETURN_TRANSACTION",
      businessDate: r.businessDate instanceof Date ? r.businessDate.toISOString() : r.businessDate,
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
    unified.sort((a, b) => new Date((b as any).businessDate ?? b.createdAt).getTime() - new Date((a as any).businessDate ?? a.createdAt).getTime());

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
    input: {
      amount?: number;
      method?: string;
      splitPayments?: Array<{ method: string; amount: number }>;
      note?: string;
      businessDate?: string;
    }
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
    const normalizedEntries = normalizePaymentEntries(input.splitPayments, input.method, Number(input.amount ?? 0));
    const paymentDelta = round2(normalizedEntries.reduce((sum, entry) => sum + entry.amount, 0));
    if (paymentDelta <= 0) throw new Error("Payment amount must be greater than zero");

    const currentAmountDue = Number(sale.amountDue ?? 0);
    if (paymentDelta > currentAmountDue + EPSILON) {
      throw new Error(`Payment cannot exceed outstanding balance of ₹${currentAmountDue.toFixed(2)}`);
    }

    const amountPaid = Number(sale.amountPaid ?? 0) + paymentDelta;
    const finalPayableAmount = Number(sale.finalPayableAmount ?? sale.total);
    const amountDue = Math.max(finalPayableAmount - amountPaid, 0);
    const paymentStatus = amountPaid >= finalPayableAmount ? "PAID" : "PARTIAL";

    const primaryMethodForSale = getPrimaryPaymentMethod(normalizedEntries, input.method ?? sale.paymentMethod);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.salePayment.createMany({
        data: normalizedEntries.map((entry) => ({
          saleId,
          amount: entry.amount,
          method: entry.method,
          note: input.note,
          businessDate: input.businessDate ? new Date(input.businessDate) : new Date(),
          createdBy: userId,
        })),
      });

      // Cast to `any` so toSaleDto can access dynamic includes (payments, user)
      // without fighting Prisma's deep-conditional return type inference.
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          amountPaid: { increment: paymentDelta },
          amountDue,
          paymentStatus,
          paymentMethod: primaryMethodForSale,
        },
        include: {
          items: { include: { product: true, size: true } },
          customer: true,
          payments: { include: { user: { select: { name: true } } }, orderBy: { paidAt: "desc" } },
          user: { select: { name: true } },
        },
      }) as any;

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { totalSpent: { increment: paymentDelta } },
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
      topUpPayments?: Array<{ method: string; amount: number }>;
      refundPayments?: Array<{ method: string; amount: number }>;
      reason?: string;
      condition?: string;
      notes?: string;
      businessDate?: string;
      transactionDate?: string;
      discountType?: "PERCENTAGE" | "FLAT";
      discountPercent?: number;
      discountAmount?: number;
      taxRate?: number;
    }
  ) {
    const supportsExchangedStatus = await supportsExchangedSaleStatus();
    const hasReturnItemsTable = await hasTable("return_transaction_items");

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

    const returnedLineItems = input.returnedItems.map((item) => {
      const historicalSaleItem = saleItemsByKey.get(`${item.productId}:${item.sizeId}`);
      const historicalUnitAmount = historicalSaleItem
        ? extractHistoricalUnitAmount(historicalSaleItem)
        : round2(Number(item.total) / Math.max(1, item.quantity));

      return {
        ...item,
        historicalUnitAmount,
        total: round2(historicalUnitAmount * item.quantity),
      };
    });

    const exchangedLineItems = (input.exchangedItems ?? []).map((item) => ({
      ...item,
      total: round2(Number(item.total ?? 0)),
    }));

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
    const returnedTotal = returnedLineItems.reduce((sum, item) => sum + item.total, 0);
    const exchangedTotal = exchangedLineItems.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate discount on the difference or exchanged total
    const baseForDiscount = Math.max(exchangedTotal, 0);
    const discountType = input.discountType ?? "PERCENTAGE";
    const discountPercent = clamp0(Number(input.discountPercent ?? 0));
    const discountAmountInput = clamp0(Number(input.discountAmount ?? 0));
    
    let discountAmount = 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = round2((baseForDiscount * discountPercent) / 100);
    } else {
      discountAmount = Math.min(discountAmountInput, baseForDiscount);
    }
    
    // Calculate final amounts
    const calculatedTotal = exchangedTotal - discountAmount;
    const taxRate = clamp0(Number(input.taxRate ?? 0));
    const taxAmount = taxRate > 0 ? round2((calculatedTotal * taxRate) / 100) : 0;
    const calculatedWithTax = calculatedTotal + taxAmount;
    
    // Apply round-off
    const finalPayable = Math.round(calculatedWithTax);
    const roundOffAmount = round2(finalPayable - calculatedWithTax);
    
    const netAmount = Math.max(finalPayable - returnedTotal, 0);
    const offsetAmount = netAmount;
    const refundAmount = Math.max(returnedTotal - finalPayable, 0);
    const businessDate = input.businessDate ? new Date(input.businessDate) : new Date();
    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const referenceNumber = await generateReturnReferenceNumber(sale.storeId, attempt - 1);

      try {
        const transaction = await prisma.$transaction(async (tx) => {
          const returnTransactionData: any = {
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
            discountType: discountType || undefined,
            discountPercent: discountPercent > 0 ? new Prisma.Decimal(discountPercent) : undefined,
            discountAmount: discountAmount > 0 ? new Prisma.Decimal(discountAmount) : undefined,
            taxRate: taxRate > 0 ? new Prisma.Decimal(taxRate) : undefined,
            calculatedTotal: new Prisma.Decimal(calculatedWithTax),
            roundOffAmount: new Prisma.Decimal(roundOffAmount),
            finalPayable: new Prisma.Decimal(finalPayable),
            splitPaymentData: (input.topUpPayments || input.refundPayments) ? JSON.stringify({
              topUpPayments: input.topUpPayments,
              refundPayments: input.refundPayments,
            }) : undefined,
            transactionDate,
            businessDate,
            createdBy: userId,
          };

          if (hasReturnItemsTable) {
            returnTransactionData.items = {
              create: [
                ...returnedLineItems.map((ri) => ({
                  returnedProductId: ri.productId,
                  returnedSizeId: ri.sizeId,
                  returnedQuantity: ri.quantity,
                  returnedUnitPrice: new Prisma.Decimal(ri.historicalUnitAmount),
                })),
                ...exchangedLineItems.map((ei) => ({
                  returnedQuantity: 0,
                  returnedUnitPrice: new Prisma.Decimal(0),
                  newProductId: ei.productId,
                  newSizeId: ei.sizeId,
                  newQuantity: ei.quantity,
                  newUnitPrice: new Prisma.Decimal(Number(ei.total) / (ei.quantity || 1)),
                })),
              ],
            };
          }

          const returnTransaction = await tx.returnTransaction.create({
            data: returnTransactionData,
          });

          if (netAmount > 0) {
            const topUpEntries = normalizePaymentEntries(input.topUpPayments, input.refundMethod, netAmount);
            const topUpTotal = round2(topUpEntries.reduce((sum, entry) => sum + entry.amount, 0));
            if (topUpTotal - netAmount > EPSILON) {
              throw new Error("Top-up split payment total cannot exceed exchange payable amount");
            }

            await tx.salePayment.createMany({
              data: topUpEntries.map((entry) => ({
                saleId,
                amount: entry.amount,
                method: entry.method,
                note: `Exchange top-up payment for ${returnTransaction.id}`,
                businessDate,
                createdBy: userId,
              })),
            });
          }

          if (refundAmount > 0) {
            const refundEntries = normalizePaymentEntries(input.refundPayments, input.refundMethod, refundAmount);
            const refundTotal = round2(refundEntries.reduce((sum, entry) => sum + entry.amount, 0));
            if (refundTotal - refundAmount > EPSILON) {
              throw new Error("Refund split payment total cannot exceed refund amount");
            }

            await tx.salePayment.createMany({
              data: refundEntries.map((entry) => ({
                saleId,
                amount: -entry.amount,
                method: entry.method,
                note: `Refund for return ${returnTransaction.id}`,
                businessDate,
                createdBy: userId,
              })),
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

                type: "RETURN",
                quantity: item.quantity,
                reason: `Return for sale ${sale.invoiceNumber}`,
                referenceType: "SALE",
                referenceId: returnTransaction.id,
                movementDate: businessDate,
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
                type: "SALE",
                quantity: item.quantity,
                reason: `Exchange for sale ${sale.invoiceNumber}`,
                referenceType: "SALE",
                referenceId: returnTransaction.id,
                movementDate: businessDate,
                createdBy: userId,
              },
            });
          }

          const saleStatus =
            input.type === "RETURN"
              ? returnStatus === "FULL"
                ? "REFUNDED"
                : sale.status
              : supportsExchangedStatus
                ? "EXCHANGED"
                : "COMPLETED";

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
        where: { businessDate: { gte: startOfMonth, lte: endOfMonth }, sale: { store: { orgId } } },
        _sum: { amount: true },
      }),
      prisma.salePayment.aggregate({
        where: { businessDate: { gte: startOfPrevMonth, lte: endOfPrevMonth }, sale: { store: { orgId } } },
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
        where: { store: { orgId }, businessDate: { gte: startOfMonth, lte: endOfMonth }, refundAmount: { gt: 0 } },
      }),
      prisma.returnTransaction.count({
        where: { store: { orgId }, businessDate: { gte: startOfPrevMonth, lte: endOfPrevMonth }, refundAmount: { gt: 0 } },
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
    const supportsExchangedStatus = await supportsExchangedSaleStatus();
    const hasReturnItemsTable = await hasTable("return_transaction_items");

    // Build sale query
    const saleWhere: any = { store: { orgId } };
    if (filters?.status) {
      if (filters.status === "EXCHANGED" && !supportsExchangedStatus) {
        saleWhere.status = "COMPLETED";
      } else {
        saleWhere.status = filters.status;
      }
    }
    if (filters?.paymentMethod) saleWhere.paymentMethod = filters.paymentMethod;

    // Date range: prefer transactionDate (backdatable canonical date); fall back
    // to createdAt for records created before the transactionDate migration.
    if (filters?.startDate || filters?.endDate) {
      if (filters?.startDate && filters?.endDate) {
        const from = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        saleWhere.transactionDate = { gte: from, lt: end };
      } else if (filters?.startDate) {
        const from = new Date(filters.startDate);
        saleWhere.transactionDate = { gte: from };
      } else if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        saleWhere.transactionDate = { lt: end };
      }
    }

    if (filters?.search) {
      saleWhere.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Build return transaction query
    const rtWhere: any = { store: { orgId } };
    if (filters?.startDate) rtWhere.businessDate = { ...(rtWhere.businessDate ?? {}), gte: new Date(filters.startDate) };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      rtWhere.businessDate = { ...(rtWhere.businessDate ?? {}), lt: end };
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
        include: hasReturnItemsTable
          ? {
              items: {
                include: {
                  returnedProduct: { select: { name: true, sku: true } },
                  returnedSize: { select: { label: true } },
                  newProduct: { select: { name: true, sku: true } },
                  newSize: { select: { label: true } },
                },
              },
              sale: { select: { invoiceNumber: true, id: true } },
              customer: true,
            }
          : {
              sale: { select: { invoiceNumber: true, id: true } },
              customer: true,
            },
        orderBy: { businessDate: "desc" },
      }),
    ]);

    const salesRows = sales.map((s) => ({
      ...s,
      rowType: "SALE",
      paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments),
      payments: (s.payments ?? []).map((p: any) => ({
        ...p,
        amount: Number(p.amount ?? 0),
        businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
      })),
      transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    }));

    const rtRows = returnTxns.map((r) => ({
      ...r,
      rowType: "RETURN_TRANSACTION",
      businessDate: r.businessDate instanceof Date ? r.businessDate.toISOString() : r.businessDate,
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

    unified.sort((a, b) => new Date((b as any).businessDate ?? b.createdAt).getTime() - new Date((a as any).businessDate ?? a.createdAt).getTime());

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

