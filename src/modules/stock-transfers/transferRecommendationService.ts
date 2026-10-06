import { prisma } from "@/lib/db";
import { replenishmentService } from "@/modules/replenishment/replenishmentService";
import { buildTransferRecommendations, type StoreVariantPosition } from "./transferPolicy";

export const transferRecommendationService = {
  async get(orgId: string, from: Date, endExclusive: Date) {
    const stores = await prisma.store.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const datasets = await Promise.all(
      stores.map((store) =>
        replenishmentService.get(orgId, store.id, from, endExclusive, { pageSize: 500 })
      )
    );
    const positions: StoreVariantPosition[] = datasets.flatMap((dataset) =>
      dataset.items.map((row) => {
        const stock = Number(row.evidence.stock ?? row.currentStock);
        const inventoryValue = Number(row.evidence.inventoryValue ?? 0);
        const forecast = row.evidence.forecast as Record<string, unknown> | undefined;
        return {
          storeId: dataset.scope.storeId,
          storeName: dataset.scope.storeName,
          productId: row.productId,
          sizeId: row.sizeId,
          product: row.product,
          sku: row.sku,
          variant: row.variant,
          action: row.type,
          currentStock: row.currentStock,
          recommendedQuantity: row.recommendedQuantity,
          evidenceQuality: row.evidenceQuality,
          targetStock: Number(row.evidence.targetStock ?? 0),
          reorderPoint: Number(row.evidence.reorderPoint ?? 0),
          usefulInbound: Number(row.evidence.usefulInbound ?? 0),
          coverDays: row.evidence.coverDays === null ? null : Number(row.evidence.coverDays ?? 0),
          unfulfilledDemand: Number(row.evidence.unfulfilledDemand ?? 0),
          unitCost: Number(row.evidence.unitCost ?? (stock > 0 ? inventoryValue / stock : 0)),
          forecastUpperDemand30: forecast ? Number(forecast.upper30Days ?? 0) : null,
          forecastEvidenceQuality: forecast
            ? (String(forecast.evidenceQuality) as StoreVariantPosition["forecastEvidenceQuality"])
            : null,
        };
      })
    );
    const items = buildTransferRecommendations(positions);
    return {
      generatedAt: new Date().toISOString(),
      stores,
      summary: {
        opportunities: items.filter((row) => row.recommendedQuantity > 0).length,
        supplierRequired: items.filter((row) => row.remainingSupplierRequirement > 0).length,
        rebalancedValue: items.reduce((sum, row) => sum + row.transferredInventoryValue, 0),
      },
      items,
    };
  },
};
