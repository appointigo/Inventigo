/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SupplierBillInput, SupplierClaimInput, SupplierClaimTransitionInput } from "../purchaseManagementContracts";

const decimal = (value: number) => new Prisma.Decimal(Math.round(value * 100)).div(100);
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const reference = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const billInclude = {
  supplier: { select: { name: true } },
  store: { select: { name: true } },
  purchaseOrder: { select: { poNumber: true } },
  lines: true,
  receiptAllocations: { include: { receipt: { select: { receiptNumber: true } } } },
  attachments: true,
  creditNotes: true,
  payable: { include: { payments: true } },
} as const;

function billDto(row: any) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    additionalCharges: Number(row.additionalCharges),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    creditAmount: Number(row.creditAmount),
    totalAmount: Number(row.totalAmount),
    lines: row.lines.map((line: any) => ({
      ...line,
      quantity: Number(line.quantity),
      unitCost: Number(line.unitCost),
      taxAmount: Number(line.taxAmount),
      discountAmount: Number(line.discountAmount),
      lineTotal: Number(line.lineTotal),
    })),
    payable: row.payable ? {
      ...row.payable,
      originalAmount: Number(row.payable.originalAmount),
      paidAmount: Number(row.payable.paidAmount),
      outstandingAmount: Number(row.payable.outstandingAmount),
    } : null,
  };
}

export const purchaseManagementService = {
  async listBills(orgId: string, storeId?: string | null) {
    const rows = await prisma.supplierBill.findMany({
      where: { orgId, ...(storeId ? { storeId } : {}) },
      include: billInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(billDto);
  },

  async createBill(orgId: string, userId: string, input: SupplierBillInput, fixedStoreId?: string | null) {
    if (fixedStoreId && fixedStoreId !== input.storeId) throw new Error("Bill store is outside your scope");
    return prisma.$transaction(async (tx) => {
      const [store, supplier, po] = await Promise.all([
        tx.store.findFirst({ where: { id: input.storeId, orgId, isActive: true }, select: { id: true } }),
        tx.supplier.findFirst({ where: { id: input.supplierId, orgId, isActive: true }, select: { id: true } }),
        input.purchaseOrderId ? tx.purchaseOrder.findFirst({
          where: { id: input.purchaseOrderId, orgId, storeId: input.storeId, supplierId: input.supplierId },
          include: { items: true },
        }) : Promise.resolve(null),
      ]);
      if (!store || !supplier) throw new Error("Supplier or store is outside the organization");
      if (input.purchaseOrderId && !po) throw new Error("Purchase order is outside the bill scope");

      const receiptIds = [...new Set(input.allocations.map((allocation) => allocation.receiptId))];
      const receipts = receiptIds.length ? await tx.purchaseOrderReceipt.findMany({
        where: {
          id: { in: receiptIds }, orgId, storeId: input.storeId, postingStatus: "POSTED",
          purchaseOrder: { supplierId: input.supplierId, ...(input.purchaseOrderId ? { id: input.purchaseOrderId } : {}) },
        },
        include: { items: true },
      }) : [];
      if (receipts.length !== receiptIds.length) throw new Error("A receipt allocation is not a posted receipt in the bill scope");
      const allocationKeys = new Set<string>();
      for (const allocation of input.allocations) {
        const allocationKey = `${allocation.receiptId}:${allocation.receiptItemId ?? "receipt"}`;
        if (allocationKeys.has(allocationKey)) throw new Error("Duplicate receipt allocations are not allowed");
        allocationKeys.add(allocationKey);
        const receipt = receipts.find((candidate) => candidate.id === allocation.receiptId);
        const receiptItem = allocation.receiptItemId
          ? receipt?.items.find((candidate) => candidate.id === allocation.receiptItemId)
          : null;
        if (allocation.receiptItemId && !receiptItem) throw new Error("Bill allocation receipt item is invalid");
        if (receiptItem) {
          const alreadyAllocated = await tx.supplierBillReceiptAllocation.aggregate({
            where: { receiptItemId: receiptItem.id, bill: { status: { not: "CANCELLED" } } },
            _sum: { quantity: true },
          });
          if (decimal(allocation.quantity).add(alreadyAllocated._sum.quantity ?? 0).gt(receiptItem.quantityAccepted)) {
            throw new Error("Billed allocations cannot exceed the remaining accepted receipt quantity");
          }
        }
      }

      const preparedLines = input.lines.map((line) => {
        const lineTotal = decimal(line.quantity * line.unitCost + line.taxAmount - line.discountAmount);
        return { ...line, lineTotal };
      });
      const subtotal = preparedLines.reduce((sum, line) => sum.add(decimal(line.quantity * line.unitCost)), new Prisma.Decimal(0));
      const total = subtotal.add(input.additionalCharges).add(input.taxAmount).sub(input.discountAmount);
      if (total.isNegative()) throw new Error("Supplier bill total cannot be negative");
      const differenceReasons: string[] = [];
      if (po) {
        const poItemIds = po.items.map((item) => item.id);
        const [acceptedRows, priorBilledRows] = await Promise.all([
          tx.purchaseOrderReceiptItem.groupBy({
            by: ["purchaseOrderItemId"],
            where: { purchaseOrderItemId: { in: poItemIds }, receipt: { postingStatus: "POSTED", reversalOfId: null } },
            _sum: { quantityAccepted: true },
          }),
          tx.supplierBillLine.groupBy({
            by: ["purchaseOrderItemId"],
            where: { purchaseOrderItemId: { in: poItemIds }, bill: { status: { not: "CANCELLED" } } },
            _sum: { quantity: true },
          }),
        ]);
        const acceptedByItem = new Map(acceptedRows.map((row) => [row.purchaseOrderItemId, Number(row._sum.quantityAccepted ?? 0)]));
        const billedByItem = new Map(priorBilledRows.map((row) => [row.purchaseOrderItemId, Number(row._sum.quantity ?? 0)]));
        const currentByItem = new Map<string, number>();
        for (const line of preparedLines) {
          if (!line.purchaseOrderItemId) {
            differenceReasons.push(`Bill line "${line.description}" is not linked to a purchase-order line`);
            continue;
          }
          const poLine = po.items.find((item) => item.id === line.purchaseOrderItemId);
          if (!poLine) {
            differenceReasons.push(`Bill line "${line.description}" is outside the purchase order`);
            continue;
          }
          currentByItem.set(poLine.id, (currentByItem.get(poLine.id) ?? 0) + line.quantity);
          if (!decimal(line.unitCost).equals(poLine.unitCost)) differenceReasons.push(`Unit price differs for ${line.description}`);
        }
        for (const poLine of po.items) {
          const current = currentByItem.get(poLine.id) ?? 0;
          const previouslyBilled = billedByItem.get(poLine.id) ?? 0;
          const accepted = acceptedByItem.get(poLine.id) ?? 0;
          const remainingAccepted = Math.max(0, accepted - previouslyBilled);
          if (current !== remainingAccepted) {
            differenceReasons.push(`Invoiced quantity ${current} differs from remaining accepted quantity ${remainingAccepted} for ${poLine.productNameSnapshot}`);
          }
          if (current + previouslyBilled > poLine.quantity) {
            differenceReasons.push(`Cumulative invoiced quantity exceeds ordered quantity for ${poLine.productNameSnapshot}`);
          }
        }
        if (input.additionalCharges || input.taxAmount || input.discountAmount || preparedLines.some((line) => line.taxAmount || line.discountAmount)) {
          differenceReasons.push("Bill charges, tax, or discounts differ from the purchase-order line values");
        }
      }
      const hasDifference = differenceReasons.length > 0;
      const bill = await tx.supplierBill.create({
        data: {
          orgId,
          storeId: input.storeId,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId ?? null,
          billNumber: reference("BILL"),
          supplierInvoiceNumber: input.supplierInvoiceNumber,
          invoiceDate: date(input.invoiceDate),
          dueDate: input.dueDate ? date(input.dueDate) : null,
          subtotal,
          additionalCharges: input.additionalCharges,
          discountAmount: input.discountAmount,
          taxAmount: input.taxAmount,
          totalAmount: total,
          matchStatus: hasDifference ? "DIFFERENCE" : "MATCHED",
          differenceReason: hasDifference ? differenceReasons.join("; ").slice(0, 2_000) : null,
          notes: input.notes,
          createdBy: userId,
          lines: { create: preparedLines.map((line) => ({
            purchaseOrderItemId: line.purchaseOrderItemId,
            variantId: line.variantId,
            description: line.description,
            quantity: line.quantity,
            unitCost: line.unitCost,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            lineTotal: line.lineTotal,
          })) },
          receiptAllocations: { create: input.allocations },
        },
        include: billInclude,
      });
      return billDto(bill);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async postBill(orgId: string, userId: string, billId: string, fixedStoreId?: string | null, approveDifference = false) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "supplier_bills" WHERE "id" = ${billId} FOR UPDATE`;
      const bill = await tx.supplierBill.findFirst({
        where: { id: billId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
        include: { payable: true },
      });
      if (!bill) throw new Error("Supplier bill not found");
      if (bill.status === "POSTED") return bill;
      if (bill.status === "CANCELLED") throw new Error("A cancelled bill cannot be posted");
      if (bill.matchStatus === "DIFFERENCE" && !approveDifference) {
        throw new Error("Review and explicitly approve bill differences before posting");
      }
      const obligation = bill.totalAmount.sub(bill.creditAmount);
      if (!obligation.isPositive()) throw new Error("Bill has no positive supplier obligation");
      await tx.supplierPayable.create({
        data: {
          orgId,
          storeId: bill.storeId,
          supplierId: bill.supplierId,
          purchaseOrderId: bill.purchaseOrderId,
          billId: bill.id,
          supplierInvoiceNumber: bill.supplierInvoiceNumber,
          invoiceDate: bill.invoiceDate,
          dueDate: bill.dueDate,
          originalAmount: obligation,
          outstandingAmount: obligation,
          notes: bill.notes,
          createdBy: userId,
        },
      });
      return tx.supplierBill.update({
        where: { id: bill.id },
        data: {
          status: "POSTED",
          matchStatus: bill.matchStatus === "DIFFERENCE" ? "APPROVED_WITH_DIFFERENCE" : bill.matchStatus,
          postedAt: new Date(),
          postedBy: userId,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return prisma.supplierBill.findUniqueOrThrow({ where: { id: result.id }, include: billInclude }).then(billDto);
  },

  async listClaims(orgId: string, storeId?: string | null) {
    return prisma.supplierClaim.findMany({
      where: { orgId, ...(storeId ? { storeId } : {}) },
      include: {
        supplier: { select: { name: true } },
        discrepancy: { include: { purchaseOrder: { select: { poNumber: true } }, receipt: { select: { receiptNumber: true } }, variant: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async createClaim(orgId: string, userId: string, input: SupplierClaimInput, fixedStoreId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const discrepancy = await tx.purchaseDiscrepancy.findFirst({
        where: { id: input.discrepancyId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}), status: "OPEN" },
        include: { purchaseOrder: { select: { supplierId: true } } },
      });
      if (!discrepancy) throw new Error("Open purchase discrepancy not found");
      if (input.quantity > discrepancy.quantity) throw new Error("Claim quantity exceeds the discrepancy quantity");
      const claim = await tx.supplierClaim.create({
        data: {
          orgId,
          storeId: discrepancy.storeId,
          claimNumber: reference("CLM"),
          supplierId: discrepancy.purchaseOrder.supplierId,
          discrepancyId: discrepancy.id,
          requestedResolution: input.requestedResolution,
          quantity: input.quantity,
          expectedReplacementAt: input.expectedReplacementAt ? date(input.expectedReplacementAt) : null,
          returnAuthorization: input.returnAuthorization,
          notes: input.notes,
          createdBy: userId,
        },
      });
      await tx.supplierClaimTransition.create({
        data: { orgId, claimId: claim.id, fromStatus: "OPEN", toStatus: "OPEN", action: "CREATE", evidence: { requestedResolution: claim.requestedResolution, quantity: claim.quantity }, notes: input.notes, performedBy: userId },
      });
      await tx.purchaseDiscrepancy.update({ where: { id: discrepancy.id }, data: { status: "CLAIMED" } });
      return claim;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async transitionClaim(
    orgId: string,
    userId: string,
    claimId: string,
    input: SupplierClaimTransitionInput,
    fixedStoreId?: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const claim = await tx.supplierClaim.findFirst({ where: { id: claimId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) }, include: { discrepancy: true } });
      if (!claim) throw new Error("Supplier claim not found");
      if (["RESOLVED", "CANCELLED"].includes(claim.status)) throw new Error("Closed supplier claims cannot be changed");
      const expectedAction = claim.requestedResolution === "RETURN" ? "RETURN"
        : claim.requestedResolution === "REPLACEMENT" ? "REPLACEMENT" : "REQUEST_CREDIT";
      if (claim.status === "OPEN" && ![expectedAction, "CANCEL"].includes(input.action)) {
        throw new Error(`This claim must follow its ${claim.requestedResolution.toLowerCase()} workflow`);
      }
      if (input.action === "RESOLVE") {
        throw new Error("A claim can only be resolved by recorded replacement, return, or credit evidence");
      }
      if (input.action === "CANCEL" && claim.status !== "OPEN") {
        throw new Error("Only an open, unprocessed claim can be cancelled");
      }
      if (input.action === "RETURN" && (!input.returnAuthorization?.trim() || claim.status !== "OPEN")) {
        throw new Error("An open return claim requires supplier return authorization");
      }
      if (input.action === "REPLACEMENT" && claim.status !== "OPEN") throw new Error("Only an open replacement claim can enter replacement pending");
      if (input.action === "REQUEST_CREDIT" && claim.status !== "OPEN") throw new Error("Only an open credit claim can request a credit note");
      if (input.action === "RECORD_CREDIT") {
        if (claim.status !== "CREDIT_NOTE_REQUESTED" || claim.requestedResolution !== "CREDIT_NOTE") {
          throw new Error("A supplier credit can only resolve a claim after a credit note was requested");
        }
        if (!input.billId || !input.creditNoteNumber?.trim() || !input.creditAmount || input.creditAmount <= 0) throw new Error("Bill, credit note number and positive credit amount are required");
        const bill = await tx.supplierBill.findFirst({ where: { id: input.billId, orgId, supplierId: claim.supplierId }, include: { payable: true } });
        if (!bill) throw new Error("Supplier bill not found for this claim");
        const amount = new Prisma.Decimal(input.creditAmount);
        if (bill.payable && amount.gt(bill.payable.outstandingAmount)) throw new Error("Credit exceeds the outstanding supplier obligation; record a supplier refund separately");
        await tx.supplierCreditNote.create({ data: { billId: bill.id, claimId: claim.id, creditNoteNumber: input.creditNoteNumber.trim(), amount, issuedAt: new Date(), notes: input.notes } });
        await tx.supplierBill.update({ where: { id: bill.id }, data: { creditAmount: { increment: amount } } });
        if (bill.payable) {
          const outstanding = bill.payable.outstandingAmount.sub(amount);
          await tx.supplierPayable.update({ where: { id: bill.payable.id }, data: { outstandingAmount: outstanding, status: outstanding.isZero() ? "PAID" : bill.payable.paidAmount.isPositive() ? "PARTIALLY_PAID" : "OPEN" } });
        }
      }
      const status = input.action === "RETURN" ? "RETURN_TO_SUPPLIER"
        : input.action === "REPLACEMENT" ? "REPLACEMENT_PENDING"
        : input.action === "REQUEST_CREDIT" ? "CREDIT_NOTE_REQUESTED"
        : input.action === "CANCEL" ? "CANCELLED"
        : input.action === "RECORD_CREDIT" ? "RESOLVED" : claim.status;
      const resolved = status === "RESOLVED" || status === "CANCELLED";
      const updated = await tx.supplierClaim.update({ where: { id: claim.id }, data: { status, returnAuthorization: input.returnAuthorization ?? claim.returnAuthorization, notes: input.notes ?? claim.notes, resolvedAt: resolved ? new Date() : null, resolvedBy: resolved ? userId : null } });
      await tx.supplierClaimTransition.create({
        data: {
          orgId, claimId: claim.id, fromStatus: claim.status, toStatus: status, action: input.action,
          evidence: input.action === "RECORD_CREDIT" ? { billId: input.billId, creditNoteNumber: input.creditNoteNumber, creditAmount: input.creditAmount }
            : input.action === "RETURN" ? { returnAuthorization: input.returnAuthorization } : undefined,
          notes: input.notes, performedBy: userId,
        },
      });
      if (resolved) await tx.purchaseDiscrepancy.update({ where: { id: claim.discrepancyId }, data: { status: status === "CANCELLED" ? "CANCELLED" : "RESOLVED", resolvedAt: new Date(), disposition: input.action } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async summary(orgId: string, storeId?: string | null) {
    const scope = { orgId, ...(storeId ? { storeId } : {}) };
    const [orders, inbound, payables, claims, bills, credits] = await Promise.all([
      prisma.purchaseOrder.count({ where: { ...scope, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } } }),
      prisma.purchaseOrder.findMany({ where: { ...scope, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } }, include: { items: { include: { receiptItems: true } } } }),
      prisma.supplierPayable.aggregate({ where: { ...scope, status: { in: ["OPEN", "PARTIALLY_PAID"] } }, _sum: { outstandingAmount: true } }),
      prisma.supplierClaim.count({ where: { ...scope, status: { notIn: ["RESOLVED", "CANCELLED"] } } }),
      prisma.supplierBill.aggregate({ where: scope, _sum: { totalAmount: true } }),
      prisma.supplierCreditNote.aggregate({ where: { bill: scope }, _sum: { amount: true } }),
    ]);
    const inboundValue = inbound.reduce((total, order) => total + order.items.reduce((sum, item) => {
      const accepted = item.receiptItems.reduce((value, receipt) => value + receipt.quantityAccepted, 0);
      return sum + Math.max(0, item.quantity - accepted) * Number(item.unitCost);
    }, 0), 0);
    return {
      openPurchaseOrders: orders,
      inboundStockValue: inboundValue,
      outstandingPayables: Number(payables._sum.outstandingAmount ?? 0),
      pendingClaims: claims,
      totalBilled: Number(bills._sum.totalAmount ?? 0),
      credits: Number(credits._sum.amount ?? 0),
    };
  },
};
