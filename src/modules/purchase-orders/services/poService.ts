/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import { adjustStockWithClient } from "@/modules/stock/services/stockService";
import { outstandingQuantity, purchaseOrderLineState, purchaseOrderStatus, validateReceiptQuantity } from "@/modules/procurement-intelligence/procurementRules";
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
  receipts: { include: { items: true }, orderBy: { receivedAt: "asc" as const } },
  _count: { select: { items: true } },
} as const;

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
  expectedDeliveryDate: po.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
  createdBy: po.createdBy,
  createdByName: po.user.name,
  items: po.items.map((item: any) => {
    const receiptItems = po.receipts.flatMap((receipt: any) => receipt.items).filter((received: any) => received.purchaseOrderItemId === item.id);
    const acceptedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityAccepted, 0);
    const rejectedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityRejected, 0);
    const damagedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityDamaged, 0);
    return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSku: item.product.sku,
    sizeId: item.sizeId,
    sizeLabel: item.size.label,
    quantity: item.quantity,
    unitCost: Number(item.unitCost),
    total: item.quantity * Number(item.unitCost),
    acceptedQuantity, rejectedQuantity, damagedQuantity,
    outstandingQuantity: outstandingQuantity(item.quantity, acceptedQuantity),
    receiptStatus: purchaseOrderLineState(item.quantity, acceptedQuantity),
  }}),
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

  async getById(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
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
        expectedDeliveryDate: values.expectedDeliveryDate ? new Date(`${values.expectedDeliveryDate}T00:00:00.000Z`) : null,
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

  async submitPO(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
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
    userId: string,
    metadata: { receivedAt?: string; supplierInvoiceNumber?: string; notes?: string } = {},
    fixedStoreId?: string | null,
  ): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
      include: { items: { include: { receiptItems: true } } },
    });
    if (!po) return null;
    if (po.status !== "ORDERED" && po.status !== "PARTIALLY_RECEIVED") {
      throw new Error("Only ordered or partially received purchase orders can be received");
    }
    const receivedAt = metadata.receivedAt ? new Date(metadata.receivedAt) : new Date();
    if (!Number.isFinite(receivedAt.getTime())) throw new Error("Received date is invalid");
    const updated = await prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseOrderReceipt.create({ data: { purchaseOrderId: id, receivedBy: userId, receivedAt, supplierInvoiceNumber: metadata.supplierInvoiceNumber?.trim() || null, notes: metadata.notes?.trim() || null } });
      for (const received of receivedItems) {
        validateReceiptQuantity({ received: received.receivedQuantity, accepted: received.acceptedQuantity, rejected: received.rejectedQuantity, damaged: received.damagedQuantity });
        const item = po.items.find((candidate) => candidate.id === received.purchaseOrderItemId);
        if (!item) throw new Error("Receipt contains an item outside this purchase order");
        const priorAccepted = item.receiptItems.reduce((sum, row) => sum + row.quantityAccepted, 0);
        if (priorAccepted + received.acceptedQuantity > item.quantity * 2) throw new Error("Accepted quantity exceeds the allowed over-receipt limit");
        await tx.purchaseOrderReceiptItem.create({ data: { receiptId: receipt.id, purchaseOrderItemId: item.id, productId: item.productId, sizeId: item.sizeId, quantityReceived: received.receivedQuantity, quantityAccepted: received.acceptedQuantity, quantityRejected: received.rejectedQuantity, quantityDamaged: received.damagedQuantity, rejectionReason: received.rejectionReason?.trim() || null, unitCostActual: received.unitCostActual ?? item.unitCost } });
        if (received.acceptedQuantity > 0) await adjustStockWithClient(tx, { orgId, productId: item.productId, sizeId: item.sizeId, storeId: po.storeId, quantity: received.acceptedQuantity, type: "IN", referenceType: "PO", referenceId: receipt.id, reason: `PO receipt ${receipt.id.slice(0, 8).toUpperCase()}`, businessDate: receivedAt, userId });
        await tx.productSupplier.upsert({ where: { productId_supplierId: { productId: item.productId, supplierId: po.supplierId } }, create: { productId: item.productId, supplierId: po.supplierId, lastPurchaseCost: received.unitCostActual ?? item.unitCost }, update: { isActive: true, lastPurchaseCost: received.unitCostActual ?? item.unitCost } });
      }
      const acceptedByLine = po.items.map((item) => ({ ordered: item.quantity, accepted: item.receiptItems.reduce((sum, row) => sum + row.quantityAccepted, 0) + receivedItems.filter((row) => row.purchaseOrderItemId === item.id).reduce((sum, row) => sum + row.acceptedQuantity, 0) }));
      const status = purchaseOrderStatus(acceptedByLine);
      return tx.purchaseOrder.update({ where: { id }, data: { status, receivedAt: status === "RECEIVED" ? receivedAt : null }, include: poInclude });
    });
    return toDto(updated);
  },

  async cancelPO(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
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
    , fixedStoreId?: string | null
  ): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
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
        ...(values.expectedDeliveryDate !== undefined && { expectedDeliveryDate: values.expectedDeliveryDate ? new Date(`${values.expectedDeliveryDate}T00:00:00.000Z`) : null }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(itemsUpdate !== undefined && { items: itemsUpdate }),
      },
      include: poInclude,
    });
    return toDto(updated);
  },
};
