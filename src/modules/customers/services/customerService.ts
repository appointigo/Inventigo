import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  CustomerListType,
  CustomerDetailDto,
  CustomerDto,
  CustomerStatsDto,
  CustomerUpsertInput,
  PaginatedCustomersDto,
} from "../types";
import { syncWhatsAppContactForCustomer } from "@/modules/whatsapp/services/WhatsAppContactService";
import { customerIntelligenceService } from "./customerIntelligenceService";

const RECENT_DAYS = 7;
const INACTIVE_DAYS = 180;
const DEFAULT_HIGH_SPENDER_THRESHOLD = 10000;

const normalizeMobile = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);

  throw new Error("Invalid mobile number");
};

const normalizeOptionalText = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const clean = value.trim();
  return clean || null;
};

const normalizeTags = (tags?: string[]): string[] | undefined => {
  if (tags === undefined) return undefined;
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
};

const normalizeDateOfBirth = (
  value: string | null | undefined
): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid dateOfBirth");
  }
  return parsed;
};

const normalizeMetadata = (
  metadata: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | undefined => {
  if (metadata === undefined) return undefined;
  if (metadata === null) return undefined;
  return metadata as Prisma.InputJsonValue;
};

const toMetadataObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getInactiveCutoff = (): Date => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);
  return cutoff;
};

const getRecentCutoff = (): Date => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
  return cutoff;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCustomerDto = (row: any): CustomerDto => ({
  // Keep lightweight computed metrics in API layer and avoid expensive joins.
  ...(function () {
    const totalSpent = Number(row.totalSpent ?? 0);
    const totalVisits = Number(row.totalVisits ?? 0);
    const lastVisitAt = row.lastVisitAt instanceof Date ? row.lastVisitAt : row.lastVisitAt ? new Date(row.lastVisitAt) : null;
    const inactiveCutoff = getInactiveCutoff();
    return {
      id: row.id,
      name: row.name ?? null,
      mobile: row.mobile,
      email: row.email ?? null,
      dateOfBirth:
        row.dateOfBirth instanceof Date ? row.dateOfBirth.toISOString() : row.dateOfBirth ?? null,
      notes: row.notes ?? null,
      lastVisitAt: lastVisitAt ? lastVisitAt.toISOString() : null,
      totalSpent,
      totalVisits,
      avgOrderValue: totalVisits > 0 ? totalSpent / totalVisits : 0,
      isInactive: !lastVisitAt || lastVisitAt < inactiveCutoff,
      tags: Array.isArray(row.tags) ? row.tags : [],
      metadata: toMetadataObject(row.metadata),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      preferredStoreId: row.preferredStoreId ?? null,
      preferredStoreName: row.preferredStore?.name ?? null,
    };
  })(),
});

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma detail projection is normalized at this API boundary. */
const toCustomerDetailDto = (row: any): CustomerDetailDto => ({
  ...toCustomerDto(row),
  groups: [],
  activityStatus: "Never purchased",
  sales: (row.sales ?? []).map((sale: any) => ({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    total: Number(sale.total),
    status: sale.status,
    createdAt: sale.transactionDate instanceof Date ? sale.transactionDate.toISOString() : sale.transactionDate,
  })),
  firstPurchaseDate: row.sales?.length ? row.sales[row.sales.length - 1].transactionDate.toISOString() : null,
  insights: {
    topCategories: topValues((row.sales ?? []).flatMap((sale: any) => sale.items ?? []).map((item: any) => item.product?.category?.name)),
    commonSizes: topValues((row.sales ?? []).flatMap((sale: any) => sale.items ?? []).map((item: any) => item.size?.label ? `${item.product?.category?.name ?? "Other"}: ${item.size.label}` : null)),
    preferredBrands: topValues((row.sales ?? []).flatMap((sale: any) => sale.items ?? []).map((item: any) => item.product?.brand?.name)),
  },
  demandRequests: (row.visits ?? []).flatMap((visit: any) => (visit.demandRequests ?? []).map((request: any) => { const attributes = toMetadataObject(request.attributes) ?? {}; const requestedSize = typeof attributes.size === "string" ? attributes.size.toLocaleLowerCase("en-IN") : null; return { id: request.id, visitId: visit.id, storeName: visit.store?.name ?? "Unknown store", requirement: request.product?.name || request.category?.name || "Customer request", reason: request.reasonCode, status: request.status, requestedQuantity: request.requestedQuantity, fulfilledQuantity: request.fulfilledQuantity, attributes, createdAt: request.createdAt.toISOString(), followUpStatus: request.followUps?.[0]?.status ?? null, restockAvailable: Boolean(request.productId && request.product?.stockEntries?.some((entry: any) => entry.quantity > 0 && entry.storeId === visit.storeId && (!requestedSize || entry.size?.label?.toLocaleLowerCase("en-IN") === requestedSize))) }; })),
  followUps: (row.followUps ?? []).map((item: any) => ({ id: item.id, title: item.title, type: item.type, status: item.status, priority: item.priority, reason: item.reason, note: item.note, dueAt: item.dueAt?.toISOString() ?? null, storeName: item.store?.name ?? "Unknown store", assigneeName: item.assignee?.name ?? null })),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const topValues = (values: Array<string | null | undefined>) => [...values.filter((value): value is string => Boolean(value)).reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value]) => value);

export const customerService = {
  normalizeMobile,

  async getOrCreateCustomer(
    orgId: string,
    mobileRaw: string,
    name?: string,
    email?: string,
    preferredStoreId?: string
  ): Promise<CustomerDto> {
    const mobile = normalizeMobile(mobileRaw);
    const cleanName = normalizeOptionalText(name);
    const cleanEmail = normalizeOptionalText(email);
    if (preferredStoreId) {
      const store = await prisma.store.findFirst({ where: { id: preferredStoreId, orgId, isActive: true }, select: { id: true } });
      if (!store) throw new Error("Invalid preferred store");
    }

    const existing = await prisma.customer.findUnique({
      where: { orgId_mobile: { orgId, mobile } },
    });

    if (existing) {
      if (
        (cleanName !== undefined && cleanName !== existing.name) ||
        (cleanEmail !== undefined && cleanEmail !== existing.email)
      ) {
        const updated = await prisma.customer.update({
          where: { id: existing.id },
          data: {
            ...(cleanName !== undefined ? { name: cleanName } : {}),
            ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
            ...(!existing.preferredStoreId && preferredStoreId ? { preferredStoreId } : {}),
          },
        });
        await syncWhatsAppContactForCustomer({ organizationId: orgId, customerId: updated.id, phone: updated.mobile });
        return toCustomerDto(updated);
      }
      await syncWhatsAppContactForCustomer({ organizationId: orgId, customerId: existing.id, phone: existing.mobile });
      return toCustomerDto(existing);
    }

    const created = await prisma.customer.create({
      data: {
        orgId,
        name: cleanName ?? null,
        mobile,
        email: cleanEmail ?? null,
        preferredStoreId: preferredStoreId ?? null,
      },
    });

    await syncWhatsAppContactForCustomer({ organizationId: orgId, customerId: created.id, phone: created.mobile });
    return toCustomerDto(created);
  },

  async getCustomerByMobile(orgId: string, mobileRaw: string): Promise<CustomerDto | null> {
    const mobile = normalizeMobile(mobileRaw);
    const row = await prisma.customer.findUnique({
      where: { orgId_mobile: { orgId, mobile } },
    });
    return row ? toCustomerDto(row) : null;
  },

  async listCustomers(
    orgId: string,
    params?: {
      search?: string;
      page?: number;
      pageSize?: number;
      type?: CustomerListType;
      highSpenderThreshold?: number;
    }
  ): Promise<PaginatedCustomersDto> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params?.pageSize ?? 10)));
    const search = params?.search?.trim();
    const type = params?.type ?? "all";
    const highSpenderThreshold =
      Number.isFinite(params?.highSpenderThreshold) && (params?.highSpenderThreshold ?? 0) > 0
        ? Number(params?.highSpenderThreshold)
        : DEFAULT_HIGH_SPENDER_THRESHOLD;
    const recentCutoff = getRecentCutoff();
    const inactiveCutoff = getInactiveCutoff();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andFilters: any[] = [];

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { mobile: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }

    if (type === "recent") {
      andFilters.push({ lastVisitAt: { gte: recentCutoff } });
    }

    if (type === "high_spenders") {
      andFilters.push({ totalSpent: { gt: highSpenderThreshold } });
    }

    if (type === "never_purchased") {
      andFilters.push({ sales: { none: { status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] } } } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      orgId,
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          mobile: true,
          totalSpent: true,
          totalVisits: true,
          lastVisitAt: true,
          preferredStoreId: true,
          preferredStore: { select: { name: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items: rows.map((row) => {
        const totalSpent = Number(row.totalSpent ?? 0);
        const totalVisits = Number(row.totalVisits ?? 0);
        const lastVisitAt = row.lastVisitAt ? row.lastVisitAt.toISOString() : null;
        const isInactive = !row.lastVisitAt || row.lastVisitAt < inactiveCutoff;
        return {
          id: row.id,
          name: row.name ?? null,
          mobile: row.mobile,
          totalSpent,
          totalVisits,
          avgOrderValue: totalVisits > 0 ? totalSpent / totalVisits : 0,
          lastVisitAt,
          isInactive,
          preferredStoreId: row.preferredStoreId,
          preferredStoreName: row.preferredStore?.name ?? null,
          segment: totalVisits === 0 ? "Lead" : totalSpent > highSpenderThreshold ? "High Value" : totalVisits >= 2 ? "Repeat" : isInactive ? "Inactive" : "Recent",
          relationshipStatus: !row.lastVisitAt || row.lastVisitAt < inactiveCutoff ? "Inactive" : row.lastVisitAt < new Date(Date.now() - 90 * 86_400_000) ? "Cooling" : "Active",
          lastPurchaseAt: lastVisitAt,
          totalOrders: totalVisits,
          groups: totalVisits === 0 ? ["Never Purchased"] : totalVisits >= 2 ? ["Repeat Customer"] : ["Recently Purchased"],
          activityStatus: totalVisits === 0 ? "Never purchased" as const : row.lastVisitAt && row.lastVisitAt >= new Date(Date.now() - 90 * 86_400_000) ? "Recently purchased" as const : "Past customer" as const,
        };
      }),
      total,
      page,
      pageSize,
    };
  },

  async getCustomerById(orgId: string, customerId: string, storeId?: string | null): Promise<CustomerDetailDto | null> {
    const row = await prisma.customer.findFirst({
      where: { id: customerId, orgId, ...(storeId ? { OR: [{ preferredStoreId: storeId }, { sales: { some: { storeId } } }, { visits: { some: { storeId } } }] } : {}) },
      include: {
        preferredStore: { select: { name: true } },
        sales: {
          orderBy: { transactionDate: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            transactionDate: true,
            createdAt: true,
            items: { select: { product: { select: { category: { select: { name: true } }, brand: { select: { name: true } } } }, size: { select: { label: true } } } },
          },
          take: 50,
        },
        visits: { orderBy: { visitedAt: "desc" }, take: 20, include: { store: { select: { name: true } }, demandRequests: { include: { product: { select: { name: true, stockEntries: { where: { quantity: { gt: 0 } }, select: { quantity: true, storeId: true, size: { select: { label: true } } } } } }, category: { select: { name: true } }, followUps: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { status: true }, take: 1 } } } } },
        followUps: { orderBy: { createdAt: "desc" }, take: 20, include: { store: { select: { name: true } }, assignee: { select: { name: true } } } },
      },
    });

    if (!row) return null;
    const detail = toCustomerDetailDto(row);
    const metrics = await customerIntelligenceService.query(orgId, { search: row.mobile, page: 1, pageSize: 10 });
    const metric = metrics.items.find(item => item.id === customerId);
    if (!metric) return detail;
    return { ...detail, totalSpent: metric.totalSpent, totalVisits: metric.totalOrders, avgOrderValue: metric.totalOrders ? metric.totalSpent / metric.totalOrders : 0, lastVisitAt: detail.lastVisitAt, groups: metric.groups, activityStatus: metric.activityStatus };
  },

  async createCustomer(orgId: string, input: CustomerUpsertInput): Promise<CustomerDto> {
    const mobileRaw = String(input.mobile ?? "").trim();
    if (!mobileRaw) {
      throw new Error("mobile is required");
    }

    const mobile = normalizeMobile(mobileRaw);
    const name = normalizeOptionalText(input.name);
    const email = normalizeOptionalText(input.email);
    const notes = normalizeOptionalText(input.notes);
    const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth);
    const tags = normalizeTags(input.tags);
    const metadata = normalizeMetadata(input.metadata);
    const preferredStoreId = input.preferredStoreId ?? null;
    if (preferredStoreId && !await prisma.store.findFirst({ where: { id: preferredStoreId, orgId }, select: { id: true } })) throw new Error("Invalid preferred store");

    try {
      const row = await prisma.customer.create({
        data: {
          orgId,
          mobile,
          name: name ?? null,
          email: email ?? null,
          notes: notes ?? null,
          dateOfBirth: dateOfBirth ?? null,
          ...(tags !== undefined ? { tags } : {}),
          ...(metadata !== undefined ? { metadata } : {}),
          preferredStoreId,
        },
      });
      await syncWhatsAppContactForCustomer({ organizationId: orgId, customerId: row.id, phone: row.mobile });
      return toCustomerDto(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create customer";
      if (/orgId_mobile|Unique constraint/i.test(message)) {
        throw new Error("Customer with this mobile already exists");
      }
      throw error;
    }
  },

  async updateCustomer(
    orgId: string,
    customerId: string,
    input: CustomerUpsertInput,
    storeId?: string | null
  ): Promise<CustomerDto | null> {
    const existing = await prisma.customer.findFirst({ where: { id: customerId, orgId, ...(storeId ? { OR: [{ preferredStoreId: storeId }, { sales: { some: { storeId } } }, { visits: { some: { storeId } } }] } : {}) } });
    if (!existing) return null;

    let normalizedMobile: string | undefined;
    if (input.mobile !== undefined) {
      normalizedMobile = normalizeMobile(input.mobile);
      if (normalizedMobile !== existing.mobile) {
        const duplicate = await prisma.customer.findUnique({
          where: { orgId_mobile: { orgId, mobile: normalizedMobile } },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== existing.id) {
          throw new Error("Customer with this mobile already exists");
        }
      }
    }

    const name = normalizeOptionalText(input.name);
    const email = normalizeOptionalText(input.email);
    const notes = normalizeOptionalText(input.notes);
    const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth);
    const tags = normalizeTags(input.tags);
    const metadata = normalizeMetadata(input.metadata);
    if (input.preferredStoreId && !await prisma.store.findFirst({ where: { id: input.preferredStoreId, orgId }, select: { id: true } })) throw new Error("Invalid preferred store");

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(normalizedMobile !== undefined ? { mobile: normalizedMobile } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        ...(input.preferredStoreId !== undefined ? { preferredStoreId: input.preferredStoreId } : {}),
      },
    });

    await syncWhatsAppContactForCustomer({ organizationId: orgId, customerId: updated.id, phone: updated.mobile });
    return toCustomerDto(updated);
  },

  async getCustomerStats(orgId: string, customerId: string): Promise<CustomerStatsDto> {
    const [visits, spend, latest] = await Promise.all([
      prisma.sale.count({
        where: { customerId, status: "COMPLETED", store: { orgId } },
      }),
      prisma.sale.aggregate({
        where: { customerId, status: "COMPLETED", store: { orgId } },
        _sum: { total: true },
      }),
      // Use transactionDate (may be backdated) as the canonical purchase date;
      // fall back to createdAt for records created before the transactionDate
      // migration (20260509000000).  We order by transactionDate DESC so that
      // a backdated sale that is actually the customer’s most-recent visit shows
      // up correctly.
      prisma.sale.findFirst({
        where: { customerId, status: "COMPLETED", store: { orgId } },
        orderBy: { transactionDate: "desc" },
        select: { transactionDate: true, createdAt: true },
      }),
    ]);

    const lastPurchaseDate =
      latest?.transactionDate ?? latest?.createdAt ?? null;

    return {
      totalVisits: visits,
      totalSpend: Number(spend._sum.total ?? 0),
      lastPurchaseDate: lastPurchaseDate ? lastPurchaseDate.toISOString() : null,
    };
  },

  async getCustomerStatsByMobile(orgId: string, mobileRaw: string): Promise<CustomerStatsDto | null> {
    const customer = await this.getCustomerByMobile(orgId, mobileRaw);
    if (!customer) return null;
    return this.getCustomerStats(orgId, customer.id);
  },
};
