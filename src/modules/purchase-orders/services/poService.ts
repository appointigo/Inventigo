import { prisma } from "@/lib/db";
import { stockService } from "@/modules/stock/services/stockService";
import type { PurchaseOrder, POFormValues, POListFilters, ReceiveItemInput } from "../types";

const poInclude = {
  supplier: { select: { name: true } },
  user: { select: { name: true } },
  items: {
    include: {
      product: { select: { name: true, sku: true } },
      size: { select: { label: true } },
    },
  },
  _count: { select: { items: true } },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (po: any): PurchaseOrder => ({
  id: po.id,
  storeId: po.storeId,
  supplierId: po.supplierId,
  supplierName: po.supplier.name,
  status: po.status,
  totalAmount: Number(po.totalAmount),
  notes: po.notes ?? null,
  orderedAt: po.orderedAt?.toISOString() ?? null,
  receivedAt: po.receivedAt?.toISOString() ?? null,
  createdBy: po.createdBy,
  createdByName: po.user.name,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: po.items.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSku: item.product.sku,
    sizeId: item.sizeId,
    sizeLabel: item.size.label,
    quantity: item.quantity,
    unitCost: Number(item.unitCost),
    total: item.quantity * Number(item.unitCost),
  })),
  itemCount: po._count.items,
  createdAt: po.createdAt.toISOString(),
  updatedAt: po.updatedAt.toISOString(),
});

export const poService = {
  async list(filters: POListFilters, orgId: string): Promise<PurchaseOrder[]> {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        store: { orgId },
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
      },
      include: poInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map(toDto);
  },

  async getById(id: string, orgId: string): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId } },
      include: poInclude,
    });
    return po ? toDto(po) : null;
  },

  async create(values: POFormValues, userId: string): Promise<PurchaseOrder> {
    const totalAmount = values.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const po = await prisma.purchaseOrder.create({
      data: {
        storeId: values.storeId,
        supplierId: values.supplierId,
        notes: values.notes ?? null,
        totalAmount,
        createdBy: userId,
        items: {
          create: values.items.map((item) => ({
            productId: item.productId,
            sizeId: item.sizeId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: poInclude,
    });
    return toDto(po);
  },

  async submitPO(id: string, orgId: string): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId } },
    });
    if (!po) return null;
    if (po.status !== "DRAFT") {
      throw new Error("Only DRAFT purchase orders can be submitted");
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "ORDERED", orderedAt: new Date() },
      include: poInclude,
    });
    return toDto(updated);
  },

  async receivePO(
    id: string,
    orgId: string,
    receivedItems: ReceiveItemInput[],
    userId: string
  ): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId } },
      include: { items: true },
    });
    if (!po) return null;
    if (po.status !== "ORDERED") {
      throw new Error("Only ORDERED purchase orders can be received");
    }

    for (const received of receivedItems) {
      const item = po.items.find((i) => i.id === received.purchaseOrderItemId);
      if (!item) continue;
      await stockService.adjustStock({
        productId: item.productId,
        sizeId: item.sizeId,
        storeId: po.storeId,
        quantity: received.receivedQuantity,
        type: "IN",
        referenceType: "PO",
        referenceId: id,
        userId,
      });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: poInclude,
    });
    return toDto(updated);
  },

  async cancelPO(id: string, orgId: string): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId } },
    });
    if (!po) return null;
    if (po.status === "RECEIVED") {
      throw new Error("Cannot cancel a received purchase order");
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: poInclude,
    });
    return toDto(updated);
  },

  async update(
    id: string,
    orgId: string,
    values: Partial<POFormValues>
  ): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId } },
    });
    if (!po) return null;
    if (po.status !== "DRAFT") {
      throw new Error("Only DRAFT purchase orders can be edited");
    }

    const itemsUpdate =
      values.items !== undefined
        ? {
            deleteMany: {},
            create: values.items.map((item) => ({
              productId: item.productId,
              sizeId: item.sizeId,
              quantity: item.quantity,
              unitCost: item.unitCost,
            })),
          }
        : undefined;

    const totalAmount =
      values.items !== undefined
        ? values.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
        : undefined;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(values.supplierId !== undefined && { supplierId: values.supplierId }),
        ...(values.notes !== undefined && { notes: values.notes ?? null }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(itemsUpdate !== undefined && { items: itemsUpdate }),
      },
      include: poInclude,
    });
    return toDto(updated);
  },
};
