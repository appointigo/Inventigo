import { prisma } from "@/lib/db";
import type { AdjustStockInput, StockLevelFilters, StockLevelRow, MovementHistoryFilters, StockMovementRow } from "../types";

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
    const { productId, sizeId, storeId, quantity, type, reason, referenceType, referenceId, userId } = input;

    return prisma.$transaction(async (tx) => {
      // Determine quantity change: IN/RETURN add stock, OUT/SALE/ADJUSTMENT can be +/-
      let quantityChange: number;
      if (type === "IN" || type === "RETURN") {
        quantityChange = Math.abs(quantity);
      } 
      else if (type === "OUT" || type === "SALE") {
        quantityChange = -Math.abs(quantity);
      } 
      else {
        // ADJUSTMENT: quantity can be positive (add) or negative (remove)
        quantityChange = quantity;
      }

      // Update stock entry
      const stockEntry = await tx.stockEntry.upsert({
        where: {
          productId_sizeId_storeId: { productId, sizeId, storeId },
        },
        update: {
          quantity: { increment: quantityChange },
          lastRestockedAt: quantityChange > 0 ? new Date() : undefined,
        },
        create: {
          productId,
          sizeId,
          storeId,
          quantity: Math.max(0, quantityChange),
          reorderLevel: 5,
          reorderQuantity: 20,
          lastRestockedAt: quantityChange > 0 ? new Date() : null,
        },
      });

      // Prevent negative stock
      if (stockEntry.quantity < 0) {
        throw new Error(
          `Insufficient stock. Available: ${stockEntry.quantity - quantityChange}, Requested: ${Math.abs(quantity)}`
        );
      }

      // Create immutable audit record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          sizeId,
          storeId,
          type,
          quantity: Math.abs(quantity),
          reason,
          referenceType: referenceType ?? "MANUAL",
          referenceId,
          createdBy: userId,
        },
      });

      return { stockEntry, movement };
    });
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
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          size: { select: { label: true } },
          user: { select: { name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      items: movements.map((m) => ({
        id: m.id,
        productName: m.product.name,
        sku: m.product.sku,
        sizeLabel: m.size.label,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason ?? null,
        userName: m.user.name,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
    };
  },
};
