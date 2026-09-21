import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { AttributeField } from "@/modules/categories/types";
import type { CustomerVisitInput, DemandAnalyticsResponse, DemandReasonCode } from "../types";
import { DEMAND_REASON_LABELS } from "../types";
import {
  canonicalAttributes,
  classifyDemandPressure,
  demandEvidenceLevel,
  demandFulfillmentRate,
  NON_STOCK_DEMAND_REASONS,
  roundDemand,
} from "../utils/demandAnalytics";
import { assertReferencesResolved, assertStoreAssignment } from "../utils/demandSecurity";

const DAY_MS = 86_400_000;

export class DemandAccessError extends Error {}
export class DemandValidationError extends Error {}

const ensureStoreAccess = async (orgId: string, userStoreId: string | null, storeId: string) => {
  try {
    assertStoreAssignment(userStoreId, storeId);
  } catch (error) {
    throw new DemandAccessError((error as Error).message);
  }
  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId, isActive: true },
    select: { id: true },
  });
  if (!store) throw new DemandAccessError("Store access denied");
};

const normalizeScalar = (value: unknown) => String(value).trim().toLocaleLowerCase("en-IN");

async function validateReferences(
  orgId: string,
  storeId: string,
  requests: CustomerVisitInput["requests"],
  linkedSaleId?: string
) {
  const categoryIds = [
    ...new Set(requests.flatMap((request) => (request.categoryId ? [request.categoryId] : []))),
  ];
  const brandIds = [
    ...new Set(requests.flatMap((request) => (request.brandId ? [request.brandId] : []))),
  ];
  const productIds = [
    ...new Set(requests.flatMap((request) => (request.productId ? [request.productId] : []))),
  ];
  const [categories, brands, products, linkedSale] = await Promise.all([
    prisma.category.findMany({
      where: { id: { in: categoryIds }, orgId, OR: [{ storeId: null }, { storeId }] },
      select: { id: true, attributeSchema: true, sizes: { select: { label: true } } },
    }),
    prisma.brand.findMany({
      where: { id: { in: brandIds }, orgId, OR: [{ storeId: null }, { storeId }] },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { id: { in: productIds }, orgId },
      select: { id: true, categoryId: true, brandId: true },
    }),
    linkedSaleId
      ? prisma.sale.findFirst({
          where: { id: linkedSaleId, storeId, store: { orgId } },
          select: { id: true },
        })
      : null,
  ]);
  try {
    assertReferencesResolved(
      categoryIds,
      categories.map((item) => item.id),
      "Category"
    );
    assertReferencesResolved(
      brandIds,
      brands.map((item) => item.id),
      "Brand"
    );
    assertReferencesResolved(
      productIds,
      products.map((item) => item.id),
      "Product"
    );
  } catch (error) {
    throw new DemandAccessError((error as Error).message);
  }
  if (linkedSaleId && !linkedSale) throw new DemandAccessError("Sale access denied");

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  requests.forEach((request) => {
    const product = request.productId ? productMap.get(request.productId) : undefined;
    if (product && request.categoryId && product.categoryId !== request.categoryId)
      throw new DemandValidationError("Product does not belong to the selected category");
    if (product && request.brandId && product.brandId !== request.brandId)
      throw new DemandValidationError("Product does not belong to the selected brand");
    if (!request.categoryId) return;
    const category = categoryMap.get(request.categoryId)!;
    const fields = (category.attributeSchema as { fields?: AttributeField[] })?.fields ?? [];
    const allowed = new Map(fields.map((field) => [field.name, field]));
    const sizeLabels = new Set(category.sizes.map((size) => normalizeScalar(size.label)));
    Object.entries(request.attributes ?? {}).forEach(([key, rawValue]) => {
      if (key.toLocaleLowerCase("en-IN") === "size") {
        if (sizeLabels.size && !sizeLabels.has(normalizeScalar(rawValue)))
          throw new DemandValidationError("Select a configured size for this category");
        return;
      }
      const field = allowed.get(key);
      if (!field)
        throw new DemandValidationError(`Attribute ${key} is not configured for this category`);
      if ((field.type === "select" || field.type === "multi-select") && field.options?.length) {
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        const options = new Set(field.options.map(normalizeScalar));
        if (values.some((value) => !options.has(normalizeScalar(value))))
          throw new DemandValidationError(`Select a configured value for ${field.name}`);
      }
    });
  });
}

const visitInclude = {
  demandRequests: {
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  },
  linkedSale: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.CustomerVisitInclude;

export const demandIntelligenceService = {
  async create(
    orgId: string,
    userId: string,
    userStoreId: string | null,
    input: CustomerVisitInput
  ) {
    await ensureStoreAccess(orgId, userStoreId, input.storeId);
    if (input.idempotencyKey) {
      const existing = await prisma.customerVisit.findFirst({
        where: { idempotencyKey: input.idempotencyKey, orgId, storeId: input.storeId },
        include: visitInclude,
      });
      if (existing) return existing;
    }
    await validateReferences(orgId, input.storeId, input.requests, input.linkedSaleId);
    return prisma.customerVisit.create({
      data: {
        orgId,
        storeId: input.storeId,
        visitedAt: input.visitedAt ? new Date(input.visitedAt) : undefined,
        outcome: input.outcome,
        linkedSaleId: input.linkedSaleId,
        source: input.source,
        notes: input.notes,
        createdBy: userId,
        idempotencyKey: input.idempotencyKey,
        demandRequests: {
          create: input.requests.map((request) => ({
            orgId,
            storeId: input.storeId,
            categoryId: request.categoryId,
            brandId: request.brandId,
            productId: request.productId,
            requestedQuantity: request.requestedQuantity,
            fulfilledQuantity: request.fulfilledQuantity,
            status: request.status,
            reasonCode: request.reasonCode,
            attributes: (request.attributes ?? {}) as Prisma.InputJsonValue,
            notes: request.notes,
          })),
        },
      },
      include: visitInclude,
    });
  },

  async list(orgId: string, userStoreId: string | null, storeId: string, start: Date, end: Date) {
    await ensureStoreAccess(orgId, userStoreId, storeId);
    return prisma.customerVisit.findMany({
      where: { orgId, storeId, visitedAt: { gte: start, lt: end } },
      include: visitInclude,
      orderBy: { visitedAt: "desc" },
      take: 200,
    });
  },

  async get(orgId: string, userStoreId: string | null, id: string) {
    const visit = await prisma.customerVisit.findFirst({
      where: { id, orgId, ...(userStoreId ? { storeId: userStoreId } : {}) },
      include: visitInclude,
    });
    if (!visit) throw new DemandAccessError("Visit not found");
    return visit;
  },

  async update(
    orgId: string,
    userStoreId: string | null,
    id: string,
    input: Partial<Omit<CustomerVisitInput, "storeId" | "idempotencyKey">>
  ) {
    const existing = await this.get(orgId, userStoreId, id);
    const finalOutcome = input.outcome ?? existing.outcome;
    const finalRequestCount = input.requests?.length ?? existing.demandRequests.length;
    if (
      (finalOutcome === "PARTIALLY_CONVERTED" || finalOutcome === "NOT_CONVERTED") &&
      finalRequestCount === 0
    ) {
      throw new DemandValidationError("This visit outcome requires a reason or demand request");
    }
    if (input.requests)
      await validateReferences(orgId, existing.storeId, input.requests, input.linkedSaleId);
    return prisma.$transaction(async (tx) => {
      if (input.requests) {
        await tx.demandRequest.deleteMany({
          where: { visitId: id, orgId, storeId: existing.storeId },
        });
      }
      return tx.customerVisit.update({
        where: { id },
        data: {
          visitedAt: input.visitedAt ? new Date(input.visitedAt) : undefined,
          outcome: input.outcome,
          linkedSaleId: input.linkedSaleId,
          source: input.source,
          notes: input.notes,
          ...(input.requests
            ? {
                demandRequests: {
                  create: input.requests.map((request) => ({
                    orgId,
                    storeId: existing.storeId,
                    categoryId: request.categoryId,
                    brandId: request.brandId,
                    productId: request.productId,
                    requestedQuantity: request.requestedQuantity,
                    fulfilledQuantity: request.fulfilledQuantity,
                    status: request.status,
                    reasonCode: request.reasonCode,
                    attributes: (request.attributes ?? {}) as Prisma.InputJsonValue,
                    notes: request.notes,
                  })),
                },
              }
            : {}),
        },
        include: visitInclude,
      });
    });
  },

  async analytics(
    orgId: string,
    userStoreId: string | null,
    storeId: string,
    start: Date,
    end: Date
  ): Promise<DemandAnalyticsResponse> {
    await ensureStoreAccess(orgId, userStoreId, storeId);
    if (!(start < end) || end.getTime() - start.getTime() > 366 * DAY_MS)
      throw new DemandValidationError("Demand analytics range must be between 1 and 366 days");
    const [visits, stock, sales] = await Promise.all([
      prisma.customerVisit.findMany({
        where: { orgId, storeId, visitedAt: { gte: start, lt: end } },
        select: {
          outcome: true,
          demandRequests: {
            select: {
              categoryId: true,
              productId: true,
              brandId: true,
              requestedQuantity: true,
              fulfilledQuantity: true,
              status: true,
              reasonCode: true,
              attributes: true,
              category: { select: { name: true } },
              brand: { select: { name: true } },
              product: { select: { name: true } },
            },
          },
        },
      }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId } },
        select: {
          quantity: true,
          size: { select: { label: true } },
          product: { select: { id: true, categoryId: true, brandId: true, attributes: true } },
        },
      }),
      prisma.sale.findMany({
        where: {
          storeId,
          store: { orgId },
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { gte: start, lt: end },
        },
        select: {
          items: { select: { quantity: true, product: { select: { categoryId: true } } } },
        },
      }),
    ]);
    const allRequests = visits.flatMap((visit) => visit.demandRequests);
    const stockDemand = allRequests.filter(
      (request) => !NON_STOCK_DEMAND_REASONS.has(request.reasonCode as DemandReasonCode)
    );
    const requestCount = stockDemand.length;
    const evidence = demandEvidenceLevel(requestCount);
    const observedDemand = stockDemand.reduce((sum, request) => sum + request.requestedQuantity, 0);
    const fulfilledQuantity = stockDemand.reduce(
      (sum, request) => sum + request.fulfilledQuantity,
      0
    );
    const unfulfilledQuantity = Math.max(0, observedDemand - fulfilledQuantity);
    const currentStockFor = (request: (typeof stockDemand)[number]) =>
      stock.reduce((sum, entry) => {
        if (
          request.productId
            ? entry.product.id !== request.productId
            : request.categoryId && entry.product.categoryId !== request.categoryId
        )
          return sum;
        if (request.brandId && entry.product.brandId !== request.brandId) return sum;
        const attrs = request.attributes as Record<string, unknown>;
        const productAttrs = entry.product.attributes as Record<string, unknown>;
        const matches = Object.entries(attrs).every(([key, value]) =>
          key.toLocaleLowerCase("en-IN") === "size"
            ? normalizeScalar(entry.size.label) === normalizeScalar(value)
            : normalizeScalar(productAttrs[key]) === normalizeScalar(value)
        );
        return matches ? sum + Math.max(0, entry.quantity) : sum;
      }, 0);
    const requirementMap = new Map<
      string,
      { request: (typeof stockDemand)[number]; observed: number; fulfilled: number; count: number }
    >();
    stockDemand.forEach((request) => {
      const attrs = canonicalAttributes(request.attributes as Record<string, unknown>);
      const key = [
        request.categoryId ?? "",
        request.brandId ?? "",
        request.productId ?? "",
        ...attrs,
      ].join("|");
      const existing = requirementMap.get(key) ?? { request, observed: 0, fulfilled: 0, count: 0 };
      existing.observed += request.requestedQuantity;
      existing.fulfilled += request.fulfilledQuantity;
      existing.count += 1;
      requirementMap.set(key, existing);
    });
    const requirements = Array.from(requirementMap.entries())
      .map(([key, value]) => {
        const attrs = canonicalAttributes(value.request.attributes as Record<string, unknown>).map(
          (item) => item.replace(":", ": ")
        );
        const requirement = [
          value.request.product?.name ?? value.request.category?.name ?? "Unspecified requirement",
          value.request.brand?.name,
          ...attrs,
        ]
          .filter(Boolean)
          .join(" / ");
        const unfulfilled = Math.max(0, value.observed - value.fulfilled);
        const currentStock = currentStockFor(value.request);
        return {
          key,
          requirement,
          categoryId: value.request.categoryId,
          productId: value.request.productId,
          observedDemand: value.observed,
          fulfilled: value.fulfilled,
          unfulfilled,
          currentStock,
          fulfillmentRate: demandFulfillmentRate(value.fulfilled, value.observed),
          signal: classifyDemandPressure({
            observed: value.observed,
            unfulfilled,
            currentStock,
            requestCount,
          }),
        };
      })
      .sort((a, b) => b.unfulfilled - a.unfulfilled || b.observedDemand - a.observedDemand);
    const categorySales = new Map<string, number>();
    sales
      .flatMap((sale) => sale.items)
      .forEach((item) =>
        categorySales.set(
          item.product.categoryId,
          (categorySales.get(item.product.categoryId) ?? 0) + item.quantity
        )
      );
    const categoryMap = new Map<
      string,
      { name: string; observed: number; fulfilled: number; count: number }
    >();
    stockDemand.forEach((request) => {
      if (!request.categoryId) return;
      const row = categoryMap.get(request.categoryId) ?? {
        name: request.category?.name ?? "Unknown",
        observed: 0,
        fulfilled: 0,
        count: 0,
      };
      row.observed += request.requestedQuantity;
      row.fulfilled += request.fulfilledQuantity;
      row.count += 1;
      categoryMap.set(request.categoryId, row);
    });
    const categories = Array.from(categoryMap.entries())
      .map(([categoryId, row]) => {
        const currentStock = stock
          .filter((entry) => entry.product.categoryId === categoryId)
          .reduce((sum, entry) => sum + Math.max(0, entry.quantity), 0);
        const lost = Math.max(0, row.observed - row.fulfilled);
        return {
          categoryId,
          category: row.name,
          sales: categorySales.get(categoryId) ?? 0,
          observedDemand: row.observed,
          unfulfilledDemand: lost,
          fulfillmentRate: demandFulfillmentRate(row.fulfilled, row.observed),
          currentStock,
          signal: classifyDemandPressure({
            observed: row.observed,
            unfulfilled: lost,
            currentStock,
            requestCount,
          }),
        };
      })
      .sort((a, b) => b.unfulfilledDemand - a.unfulfilledDemand);
    const attributeMap = new Map<
      string,
      { attribute: string; value: string; observed: number; unfulfilled: number }
    >();
    stockDemand.forEach((request) =>
      Object.entries(request.attributes as Record<string, unknown>).forEach(
        ([attribute, rawValue]) => {
          const values = Array.isArray(rawValue) ? rawValue : [rawValue];
          values.forEach((value) => {
            const key = `${attribute}:${String(value)}`;
            const row = attributeMap.get(key) ?? {
              attribute,
              value: String(value),
              observed: 0,
              unfulfilled: 0,
            };
            row.observed += request.requestedQuantity;
            row.unfulfilled += Math.max(0, request.requestedQuantity - request.fulfilledQuantity);
            attributeMap.set(key, row);
          });
        }
      )
    );
    const attributes = Array.from(attributeMap.values())
      .map((row) => ({
        attribute: row.attribute,
        value: row.value,
        observedDemand: row.observed,
        unfulfilledDemand: row.unfulfilled,
        observedDemandShare:
          observedDemand > 0 ? roundDemand((row.observed / observedDemand) * 100) : 0,
      }))
      .sort((a, b) => b.unfulfilledDemand - a.unfulfilledDemand);
    const reasonCounts = new Map<DemandReasonCode, number>();
    allRequests.forEach((request) =>
      reasonCounts.set(
        request.reasonCode as DemandReasonCode,
        (reasonCounts.get(request.reasonCode as DemandReasonCode) ?? 0) + 1
      )
    );
    return {
      generatedAt: new Date().toISOString(),
      range: { start: start.toISOString(), end: end.toISOString() },
      evidence,
      evidenceNote:
        evidence === "none"
          ? "No structured demand requests were recorded in this period."
          : evidence === "early"
            ? `Only ${requestCount} stock-demand requests were recorded; treat signals as early evidence.`
            : `${requestCount} stock-demand requests provide a usable observed-demand sample.`,
      visits: {
        total: visits.length,
        converted: visits.filter((visit) => visit.outcome === "CONVERTED").length,
        partiallyConverted: visits.filter((visit) => visit.outcome === "PARTIALLY_CONVERTED")
          .length,
        nonConverted: visits.filter((visit) => visit.outcome === "NOT_CONVERTED").length,
        browsing: visits.filter((visit) => visit.outcome === "BROWSING").length,
        conversionRate: visits.length
          ? roundDemand(
              (visits.filter(
                (visit) => visit.outcome === "CONVERTED" || visit.outcome === "PARTIALLY_CONVERTED"
              ).length /
                visits.length) *
                100
            )
          : null,
      },
      demand: {
        totalRequests: allRequests.length,
        fulfilledRequests: allRequests.filter((request) => request.status === "FULFILLED").length,
        partiallyFulfilledRequests: allRequests.filter(
          (request) => request.status === "PARTIALLY_FULFILLED"
        ).length,
        unfulfilledRequests: allRequests.filter((request) => request.status === "UNFULFILLED")
          .length,
        observedDemand,
        fulfilledQuantity,
        unfulfilledQuantity,
        fulfillmentRate: demandFulfillmentRate(fulfilledQuantity, observedDemand),
      },
      reasons: Array.from(reasonCounts.entries())
        .map(([reasonCode, count]) => ({
          reasonCode,
          label: DEMAND_REASON_LABELS[reasonCode],
          count,
          share: allRequests.length ? roundDemand((count / allRequests.length) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),
      requirements,
      categories,
      attributes,
    };
  },
};
