import { prisma } from "@/lib/db";
import { demandIntelligenceService } from "@/modules/demand-intelligence/services/demandIntelligenceService";
const round = (v: number, d = 1) => Number(v.toFixed(d));
const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLocaleLowerCase("en-IN");
type Breakdown = {
  id: string;
  label: string;
  observedDemand: number;
  fulfilledQuantity: number;
  unfulfilledQuantity: number;
  fulfillmentRate: number | null;
  requestCount: number;
};
function aggregate<T>(
  rows: T[],
  key: (row: T) => { id: string; label: string } | null,
  quantity: (row: T) => { requested: number; fulfilled: number }
) {
  const map = new Map<string, Breakdown>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    const q = quantity(row);
    const current = map.get(k.id) ?? {
      ...k,
      observedDemand: 0,
      fulfilledQuantity: 0,
      unfulfilledQuantity: 0,
      fulfillmentRate: null,
      requestCount: 0,
    };
    current.observedDemand += q.requested;
    current.fulfilledQuantity += q.fulfilled;
    current.requestCount++;
    current.unfulfilledQuantity = Math.max(0, current.observedDemand - current.fulfilledQuantity);
    current.fulfillmentRate = current.observedDemand
      ? round((current.fulfilledQuantity / current.observedDemand) * 100)
      : null;
    map.set(k.id, current);
  }
  return [...map.values()].sort(
    (a, b) => b.unfulfilledQuantity - a.unfulfilledQuantity || b.observedDemand - a.observedDemand
  );
}
export const lostOpportunityService = {
  async getData(
    orgId: string,
    userStoreId: string | null,
    storeId: string,
    start: Date,
    end: Date
  ) {
    const [base, requests, stock] = await Promise.all([
      demandIntelligenceService.analytics(orgId, userStoreId, storeId, start, end),
      prisma.demandRequest.findMany({
        where: { orgId, storeId, createdAt: { gte: start, lt: end } },
        select: {
          id: true,
          createdAt: true,
          productId: true,
          categoryId: true,
          brandId: true,
          requestedQuantity: true,
          fulfilledQuantity: true,
          attributes: true,
          reasonCode: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
          product: { select: { name: true, sku: true } },
          visit: { select: { customer: { select: { id: true, name: true, mobile: true } } } },
        },
      }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId }, quantity: { gt: 0 } },
        select: { productId: true, quantity: true, size: { select: { label: true } } },
      }),
    ]);
    const stockReasons = new Set([
      "OUT_OF_STOCK",
      "VARIANT_UNAVAILABLE",
      "PRODUCT_UNAVAILABLE",
      "BRAND_UNAVAILABLE",
      "FEATURE_UNAVAILABLE",
      "COLOR_UNAVAILABLE",
      "SIZE_UNAVAILABLE",
    ]);
    const eligible = requests.filter((r) => stockReasons.has(r.reasonCode));
    const q = (r: (typeof eligible)[number]) => ({
      requested: r.requestedQuantity,
      fulfilled: r.fulfilledQuantity,
    });
    const categories = aggregate(
      eligible,
      (r) =>
        r.categoryId ? { id: r.categoryId, label: r.category?.name ?? "Unknown category" } : null,
      q
    );
    const brands = aggregate(
      eligible,
      (r) => (r.brandId ? { id: r.brandId, label: r.brand?.name ?? "Unknown brand" } : null),
      q
    );
    const products = aggregate(
      eligible,
      (r) =>
        r.productId ? { id: r.productId, label: r.product?.name ?? "Unknown product" } : null,
      q
    );
    const dayMap = new Map<
      string,
      {
        label: string;
        observedDemand: number;
        fulfilledQuantity: number;
        unfulfilledQuantity: number;
      }
    >();
    for (const r of eligible) {
      const label = r.createdAt.toISOString().slice(0, 10);
      const row = dayMap.get(label) ?? {
        label,
        observedDemand: 0,
        fulfilledQuantity: 0,
        unfulfilledQuantity: 0,
      };
      row.observedDemand += r.requestedQuantity;
      row.fulfilledQuantity += r.fulfilledQuantity;
      row.unfulfilledQuantity = Math.max(0, row.observedDemand - row.fulfilledQuantity);
      dayMap.set(label, row);
    }
    const awaiting = eligible.flatMap((r) => {
      const unfulfilled = Math.max(0, r.requestedQuantity - r.fulfilledQuantity);
      if (!unfulfilled || !r.productId || !r.visit.customer) return [];
      const attrs = r.attributes as Record<string, unknown>;
      const requestedSize = Object.entries(attrs).find(([k]) => norm(k) === "size")?.[1];
      const matching = stock.filter(
        (s) =>
          s.productId === r.productId &&
          (!requestedSize || norm(s.size.label) === norm(requestedSize))
      );
      const currentStock = matching.reduce((sum, s) => sum + s.quantity, 0);
      if (currentStock <= 0) return [];
      return [
        {
          requestId: r.id,
          customerId: r.visit.customer.id,
          customer: r.visit.customer.name || r.visit.customer.mobile,
          mobile: r.visit.customer.mobile,
          productId: r.productId,
          product: r.product?.name ?? "Product",
          sku: r.product?.sku ?? "",
          attributes: attrs,
          unfulfilledQuantity: unfulfilled,
          currentStock,
          requestedAt: r.createdAt.toISOString(),
        },
      ];
    });
    return {
      ...base,
      scope: { type: "STORE" as const, storeId },
      breakdowns: { categories, brands, products, attributes: base.attributes },
      trend: [...dayMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
      customersAwaitingRestock: awaiting,
      note: "No rupee value is assigned because demand records do not capture a reliable requested transaction value.",
    };
  },
};
