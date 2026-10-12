import { prisma } from "@/lib/db";
import type { Supplier, SupplierFormValues } from "../types";

const include = { _count: { select: { purchaseOrders: true } } } as const;

type SupplierWithCount = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { purchaseOrders: number };
};

const toDto = (s: SupplierWithCount): Supplier => ({
  id: s.id,
  name: s.name,
  contactPerson: s.contactPerson,
  email: s.email,
  phone: s.phone,
  address: s.address,
  isActive: s.isActive,
  poCount: s._count.purchaseOrders,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

export const supplierService = {
  async list(orgId: string): Promise<Supplier[]> {
    const suppliers = await prisma.supplier.findMany({
      where: { orgId },
      include,
      orderBy: { name: "asc" },
    });
    return suppliers.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<Supplier | null> {
    const s = await prisma.supplier.findFirst({
      where: { id, orgId },
      include,
    });
    return s ? toDto(s) : null;
  },

  async create(orgId: string, values: SupplierFormValues): Promise<Supplier> {
    const s = await prisma.supplier.create({
      data: {
        orgId,
        name: values.name.trim(),
        contactPerson: values.contactPerson?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        address: values.address?.trim() || null,
        isActive: values.isActive,
      },
      include,
    });
    return toDto(s);
  },

  async update(orgId: string, id: string, values: Partial<SupplierFormValues>): Promise<Supplier | null> {
    const existing = await prisma.supplier.findFirst({ where: { id, orgId } });
    if (!existing) return null;
    const s = await prisma.supplier.update({
      where: { id },
      data: {
        ...(values.name !== undefined && { name: values.name.trim() }),
        ...(values.contactPerson !== undefined && { contactPerson: values.contactPerson.trim() || null }),
        ...(values.email !== undefined && { email: values.email.trim() || null }),
        ...(values.phone !== undefined && { phone: values.phone.trim() || null }),
        ...(values.address !== undefined && { address: values.address.trim() || null }),
        ...(values.isActive !== undefined && { isActive: values.isActive }),
      },
      include,
    });
    return toDto(s);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.supplier.findFirst({
      where: { id, orgId },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    if (!existing) return false;
    if (existing._count.purchaseOrders > 0) {
      throw new Error("Cannot delete supplier with existing purchase orders");
    }
    await prisma.supplier.delete({ where: { id } });
    return true;
  },
};
