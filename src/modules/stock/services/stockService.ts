import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AdjustStockInput, StockLevelFilters, StockLevelRow, MovementHistoryFilters, StockMovementRow } from "../types";
import { resolveStockDelta, stockAuditSnapshot } from "../utils/stockMovementContract";

/**
 * Central Stock Service — THE single source of truth for all inventory mutations.
 *
 * All stock changes (manual adjustments, PO receives, future billing sales/refunds)
 * flow through this service. Never modify StockEntry or create StockMovement directly.
 */
export const stockService = {
  /**
   * Adjust stock for a product+size+store combination.
   * Creates a StockMovement audit record and updates the StockEntry atomically.
   */
  async adjustStock(input: AdjustStockInput) {
    return prisma.$transaction((tx) => adjustStockWithClient(tx, input));
  },

  /**
   * Get stock levels with filters, joined with product/category/brand info.
   */
  async getStockLevels(filters: StockLevelFilters): Promise<{ items: StockLevelRow[]; total: number }> {
    const { storeId, categoryId, brandId, productId, lowStockOnly, outOfStockOnly, search, page = 1, pageSize = 20 } = filters;

    const where: Record<string, unknown> = { storeId };

    if (productId) where.productId = productId;
    if (categoryId) where.product = { ...((where.product as object) || {}), categoryId };
    if (brandId) where.product = { ...((where.product as object) || {}), brandId };
    if (search) {
      where.OR = [
        { variantSku: { contains: search, mode: "insensitive" } },
        {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { externalBarcode: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (outOfStockOnly) {
      where.quantity = 0;
    } 
    else if (lowStockOnly) {
      // Prisma doesn't support field-to-field comparison in where directly
      // We'll filter after query or use raw SQL
      // For now, fetch all and filter
    }

    const [entries, total] = await Promise.all([
      prisma.stockEntry.findMany({
        where,
        include: {
          product: {
            include: {
              category: { select: { name: true } },
              brand: { select: { name: true } },
              // attributes for dynamic columns (same as billing page)
            },
          },
          size: { select: { label: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ product: { name: "asc" } }, { size: { sortOrder: "asc" } }],
      }),
      prisma.stockEntry.count({ where }),
    ]);

    let items: StockLevelRow[] = entries.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.product.name,
      sku: entry.product.sku,
      externalBarcode: entry.product.externalBarcode ?? null,
      variantSku: entry.variantSku ?? null,
      attributes: (entry.product.attributes ?? {}) as Record<string, unknown>,
      categoryName: entry.product.category.name,
      brandName: entry.product.brand.name,
      sizeId: entry.sizeId,
      sizeLabel: entry.size.label,
      quantity: entry.quantity,
      reorderLevel: entry.reorderLevel,
      reorderQuantity: entry.reorderQuantity,
      status: entry.quantity === 0 ? "OUT" : entry.quantity <= entry.reorderLevel ? "LOW" : "OK",
      lastRestockedAt: entry.lastRestockedAt,
    }));

    // Post-filter for low stock if needed
    if (lowStockOnly) {
      items = items.filter((item) => item.status === "LOW" || item.status === "OUT");
    }

    return { items, total };
  },

  /**
   * Get stock movement history (audit log).
   */
  async getMovementHistory(filters: MovementHistoryFilters): Promise<{ items: StockMovementRow[]; total: number }> {
    const { storeId, productId, type, startDate, endDate, page = 1, pageSize = 20 } = filters;

    const where: Record<string, unknown> = { storeId };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.movementDate = {};
      if (startDate) (where.movementDate as Record<string, unknown>).gte = startDate;
      if (endDate) (where.movementDate as Record<string, unknown>).lte = endDate;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true, category: { select: { name: true } } } },
          size: { select: { label: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { movementDate: "desc" },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Resolve user names in a separate query so orphaned historical rows don't
    // break dashboard APIs due to strict relation hydration.
    const creatorIds = Array.from(new Set(movements.map((m) => m.createdBy).filter(Boolean)));
    const users = creatorIds.length
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
    const userNameById = new Map(users.map((u) => [u.id, u.name]));

    return {
      items: movements.map((m) => ({
        id: m.id,
        productName: m.product.name,
        sku: m.product.sku,
        categoryName: m.product.category.name,
        sizeLabel: m.size.label,
        type: m.type,
        quantity: m.quantity,
        deltaQuantity: m.deltaQuantity,
        quantityBefore: m.quantityBefore,
        quantityAfter: m.quantityAfter,
        reason: m.reason ?? null,
        userName: userNameById.get(m.createdBy) ?? "Unknown",
        movementDate: m.movementDate.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
      total,
    };
  },
};

export async function adjustStockWithClient(
  tx: Prisma.TransactionClient,
  input: AdjustStockInput,
) {
  const { orgId, productId, sizeId, storeId, quantity, type, operation, reason, referenceType, referenceId, businessDate, userId } = input;
  const [store, product] = await Promise.all([
    tx.store.findFirst({ where: { id: storeId, orgId, isActive: true }, select: { id: true } }),
    tx.product.findFirst({ where: { id: productId, orgId, category: { sizes: { some: { id: sizeId } } } }, select: { id: true } }),
  ]);
  if (!store || !product) throw new Error("Stock target is outside the selected store scope");
  const existing = await tx.stockEntry.findUnique({ where: { productId_sizeId_storeId: { productId, sizeId, storeId } }, select: { quantity: true } });
  const quantityBefore = existing?.quantity ?? 0;
  const deltaQuantity = resolveStockDelta({ type, quantity, quantityBefore, operation });
  const audit = stockAuditSnapshot(quantityBefore, deltaQuantity);
  const stockEntry = await tx.stockEntry.upsert({
    where: { productId_sizeId_storeId: { productId, sizeId, storeId } },
    update: { quantity: { increment: deltaQuantity }, lastRestockedAt: deltaQuantity > 0 ? new Date() : undefined },
    create: { productId, sizeId, storeId, quantity: audit.quantityAfter, reorderLevel: 5, reorderQuantity: 20, lastRestockedAt: deltaQuantity > 0 ? new Date() : null },
  });
  const movement = await tx.stockMovement.create({
    data: { productId, sizeId, storeId, type, ...audit, reason, referenceType: referenceType ?? "MANUAL", referenceId, movementDate: businessDate ?? new Date(), createdBy: userId },
  });
  return { stockEntry, movement };
}
