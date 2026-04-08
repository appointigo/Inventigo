import { prisma } from "@/lib/db";
import type { PromoCode, CreatePromoInput, UpdatePromoInput, PromoUsageSale } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (p: any): PromoCode => ({
  id: p.id,
  code: p.code,
  label: p.label,
  desc: p.desc,
  discountPct: Number(p.discountPct),
  isActive: p.isActive,
  maxUses: p.maxUses ?? null,
  usageCount: p.usageCount,
  expiresAt: p.expiresAt instanceof Date ? p.expiresAt.toISOString() : (p.expiresAt ?? null),
  createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
});

export const promoService = {
  async list(orgId: string): Promise<PromoCode[]> {
    const promos = await prisma.promoCode.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return promos.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<PromoCode | null> {
    const promo = await prisma.promoCode.findFirst({
      where: { id, orgId },
    });
    return promo ? toDto(promo) : null;
  },

  async create(orgId: string, input: CreatePromoInput): Promise<PromoCode> {
    const code = input.code.toUpperCase().trim();
    const promo = await prisma.promoCode.create({
      data: {
        orgId,
        code,
        label: input.label.trim(),
        desc: input.desc?.trim() ?? "",
        discountPct: input.discountPct,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    return toDto(promo);
  },

  async update(orgId: string, id: string, input: UpdatePromoInput): Promise<PromoCode | null> {
    const existing = await prisma.promoCode.findFirst({ where: { id, orgId } });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (input.code !== undefined) data.code = input.code.toUpperCase().trim();
    if (input.label !== undefined) data.label = input.label.trim();
    if (input.desc !== undefined) data.desc = input.desc.trim();
    if (input.discountPct !== undefined) data.discountPct = input.discountPct;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if ("maxUses" in input) data.maxUses = input.maxUses ?? null;
    if ("expiresAt" in input) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const updated = await prisma.promoCode.update({ where: { id }, data });
    return toDto(updated);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.promoCode.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.promoCode.delete({ where: { id } });
    return true;
  },

  async getUsage(orgId: string, id: string): Promise<PromoUsageSale[]> {
    const promo = await prisma.promoCode.findFirst({ where: { id, orgId } });
    if (!promo) return [];

    const sales = await prisma.sale.findMany({
      where: { promoCodeId: id, store: { orgId } },
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        total: true,
        discountAmount: true,
        customerName: true,
        customerPhone: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      createdAt: s.createdAt.toISOString(),
      total: Number(s.total),
      discountAmount: Number(s.discountAmount),
      customerName: s.customerName ?? null,
      customerPhone: s.customerPhone ?? null,
    }));
  },
};
