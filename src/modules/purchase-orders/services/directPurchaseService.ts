import { PaymentStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { financeService } from "@/modules/finance/financeService";
import type { POFormValues, ReceiveItemInput } from "../types";
import { poService } from "./poService";
import { purchaseManagementService } from "./purchaseManagementService";

type DirectPurchaseInput = POFormValues & {
  idempotencyKey: string;
  supplierInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  payment?: { amount: number; accountId?: string; method?: string; paymentDate: string; reference?: string };
  resolutions?: Record<string, ReceiveItemInput["catalogResolution"]>;
};

export const directPurchaseService = {
  async confirm(orgId: string, userId: string, input: DirectPurchaseInput, fixedStoreId?: string | null) {
    const key = `DIRECT_PURCHASE:${orgId}:${input.idempotencyKey.trim()}`;
    const replay = await prisma.purchase.findUnique({ where: { idempotencyKey: key }, include: { purchaseOrder: true, receipt: true, bill: { include: { payable: true } } } });
    if (replay) return replay;
    const po = await poService.create({
      storeId: input.storeId,
      supplierId: input.supplierId,
      notes: input.notes,
      deliveryInstructions: input.deliveryInstructions,
      orderDate: input.orderDate,
      expectedDeliveryDate: input.expectedDeliveryDate,
      items: input.items,
    }, userId, orgId);
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { source: "DIRECT_PURCHASE" } });
    await poService.submitPO(po.id, orgId, userId, fixedStoreId);
    const receiptConfirmation = randomUUID();
    await poService.receivePO(po.id, orgId, po.items.map((item, index) => ({
      purchaseOrderItemId: item.id,
      mappingKey: `direct-${index}`,
      receivedQuantity: item.quantity,
      acceptedQuantity: item.quantity,
      heldQuantity: 0,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      unitCostActual: item.unitCost,
      catalogResolution: item.itemKind === "PROVISIONAL_PRODUCT" ? input.resolutions?.[String(index)] : undefined,
    })), userId, { confirmationId: receiptConfirmation, supplierInvoiceNumber: input.supplierInvoiceNumber }, fixedStoreId);
    const receipt = await prisma.purchaseOrderReceipt.findUniqueOrThrow({ where: { confirmationId: receiptConfirmation } });
    const invoiceDate = input.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const bill = await purchaseManagementService.createBill(orgId, userId, {
      storeId: input.storeId,
      supplierId: input.supplierId,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: input.supplierInvoiceNumber || `DIRECT-${receipt.receiptNumber}`,
      invoiceDate,
      dueDate: input.dueDate,
      additionalCharges: 0,
      discountAmount: 0,
      taxAmount: 0,
      notes: input.notes,
      lines: po.items.map((item) => ({ purchaseOrderItemId: item.id, description: `${item.productName} · ${item.sizeLabel}`, quantity: item.quantity, unitCost: item.unitCost, taxAmount: 0, discountAmount: 0 })),
      allocations: [],
    }, fixedStoreId);
    const posted = await purchaseManagementService.postBill(orgId, userId, bill.id, fixedStoreId, false);
    let payment = null;
    if (input.payment?.amount) {
      if (!posted.payable) throw new Error("Direct purchase payable was not created");
      payment = await financeService.paySupplier(orgId, userId, posted.payable.id, { ...input.payment, idempotencyKey: input.idempotencyKey }, fixedStoreId);
    }
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: input.supplierId }, select: { name: true } });
    const subtotal = po.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    return prisma.purchase.create({
      data: {
        orgId,
        storeId: input.storeId,
        supplierId: input.supplierId,
        purchaseOrderId: po.id,
        receiptId: receipt.id,
        billId: bill.id,
        idempotencyKey: key,
        purchaseNumber: `DP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
        purchaseDate: new Date(`${invoiceDate}T00:00:00.000Z`),
        supplierNameSnapshot: supplier.name,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        paymentStatus: payment ? (input.payment!.amount >= posted.totalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL) : PaymentStatus.PENDING,
        paymentMethod: input.payment?.method,
        notes: input.notes,
        subtotal: new Prisma.Decimal(subtotal),
        totalAmount: new Prisma.Decimal(subtotal),
        createdBy: userId,
        items: { create: po.items.map((item) => ({ categoryNameSnapshot: item.categoryName || "Unclassified", attributesSnapshot: { sourcePurchaseOrderItemId: item.id }, unitSnapshot: item.sizeLabel, totalQuantity: item.quantity, unitCost: item.unitCost, lineTotal: item.quantity * item.unitCost })) },
      },
      include: { purchaseOrder: true, receipt: true, bill: { include: { payable: true } } },
    });
  },
};
