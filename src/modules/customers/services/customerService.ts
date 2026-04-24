import { prisma } from "@/lib/db";
import type {
  CustomerListType,
  CustomerDetailDto,
  CustomerDto,
  CustomerStatsDto,
  CustomerUpsertInput,
  PaginatedCustomersDto,
} from "../types";

const RECENT_DAYS = 7;
const INACTIVE_DAYS = 60;
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
): Record<string, unknown> | null | undefined => {
  if (metadata === undefined) return undefined;
  if (metadata === null) return null;
  return metadata;
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
    };
  })(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCustomerDetailDto = (row: any): CustomerDetailDto => ({
  ...toCustomerDto(row),
  sales: (row.sales ?? []).map((sale: any) => ({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    total: Number(sale.total),
    status: sale.status,
    createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : sale.createdAt,
  })),
});

export const customerService = {
  normalizeMobile,

  async getOrCreateCustomer(
    orgId: string,
    mobileRaw: string,
    name?: string,
    email?: string
  ): Promise<CustomerDto> {
    const mobile = normalizeMobile(mobileRaw);
    const cleanName = normalizeOptionalText(name);
    const cleanEmail = normalizeOptionalText(email);

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
          },
        });
        return toCustomerDto(updated);
      }
      return toCustomerDto(existing);
    }

    const created = await prisma.customer.create({
      data: {
        orgId,
        name: cleanName ?? null,
        mobile,
        email: cleanEmail ?? null,
      },
    });

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

    if (type === "inactive") {
      andFilters.push({
        OR: [{ lastVisitAt: null }, { lastVisitAt: { lt: inactiveCutoff } }],
      });
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
        };
      }),
      total,
      page,
      pageSize,
    };
  },

  async getCustomerById(orgId: string, customerId: string): Promise<CustomerDetailDto | null> {
    const row = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
          take: 50,
        },
      },
    });

    return row ? toCustomerDetailDto(row) : null;
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
        },
      });
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
    input: CustomerUpsertInput
  ): Promise<CustomerDto | null> {
    const existing = await prisma.customer.findFirst({ where: { id: customerId, orgId } });
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
      },
    });

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
      prisma.sale.findFirst({
        where: { customerId, status: "COMPLETED", store: { orgId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalVisits: visits,
      totalSpend: Number(spend._sum.total ?? 0),
      lastPurchaseDate: latest?.createdAt ? latest.createdAt.toISOString() : null,
    };
  },

  async getCustomerStatsByMobile(orgId: string, mobileRaw: string): Promise<CustomerStatsDto | null> {
    const customer = await this.getCustomerByMobile(orgId, mobileRaw);
    if (!customer) return null;
    return this.getCustomerStats(orgId, customer.id);
  },
};
