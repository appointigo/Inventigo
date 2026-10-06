import { Prisma, StockTransferStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adjustStockWithClient } from "@/modules/stock/services/stockService";
import { reconcileTransfer, validateLiveTransfer } from "./transferPolicy";

type TransferItemInput = { productId: string; sizeId: string; quantity: number; notes?: string };

const include = {
  sourceStore: { select: { id: true, name: true } },
  destinationStore: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  dispatchedBy: { select: { id: true, name: true } },
  receivedBy: { select: { id: true, name: true } },
  items: {
    include: {
      product: { select: { name: true, sku: true, costPrice: true } },
      size: { select: { label: true } },
    },
  },
} satisfies Prisma.StockTransferInclude;

async function liveSafety(
  tx: Prisma.TransactionClient,
  transfer: {
    sourceStoreId: string;
    destinationStoreId: string;
    recommendationEvidence: Prisma.JsonValue | null;
  },
  item: { productId: string; sizeId: string; requestedQuantity: number }
) {
  const [source, destination, sourceRecommendation] = await Promise.all([
    tx.stockEntry.findUnique({
      where: {
        productId_sizeId_storeId: {
          productId: item.productId,
          sizeId: item.sizeId,
          storeId: transfer.sourceStoreId,
        },
      },
      select: { quantity: true, reorderLevel: true },
    }),
    tx.stockEntry.findUnique({
      where: {
        productId_sizeId_storeId: {
          productId: item.productId,
          sizeId: item.sizeId,
          storeId: transfer.destinationStoreId,
        },
      },
      select: { quantity: true },
    }),
    tx.replenishmentRecommendation.findFirst({
      where: { storeId: transfer.sourceStoreId, productId: item.productId, sizeId: item.sizeId },
      orderBy: { evaluatedAt: "desc" },
      select: { evidence: true },
    }),
  ]);
  const sourceEvidence = (sourceRecommendation?.evidence ?? {}) as Record<string, unknown>;
  const protectedStock = Math.max(
    source?.reorderLevel ?? 0,
    Number(sourceEvidence.reorderPoint ?? 0)
  );
  const safelyAvailable = Math.max(0, (source?.quantity ?? 0) - protectedStock);
  const recommendationEvidence = (transfer.recommendationEvidence ?? {}) as Record<string, unknown>;
  const originalRequirement = Number(recommendationEvidence.destinationRequirement ?? 0);
  const originalStock = Number(recommendationEvidence.destinationCurrentStock ?? 0);
  const destinationNeed = originalRequirement
    ? Math.max(0, originalRequirement - Math.max(0, (destination?.quantity ?? 0) - originalStock))
    : item.requestedQuantity;
  return { safelyAvailable, protectedStock, destinationNeed };
}

export const stockTransferService = {
  async list(orgId: string, storeId?: string | null, status?: StockTransferStatus) {
    return prisma.stockTransfer.findMany({
      where: {
        orgId,
        ...(storeId ? { OR: [{ sourceStoreId: storeId }, { destinationStoreId: storeId }] } : {}),
        ...(status ? { status } : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  async create(input: {
    orgId: string;
    sourceStoreId: string;
    destinationStoreId: string;
    requestedById: string;
    notes?: string;
    expectedArrivalAt?: Date;
    recommendationEvidence?: Prisma.InputJsonValue;
    items: TransferItemInput[];
  }) {
    if (input.sourceStoreId === input.destinationStoreId)
      throw new Error("Source and destination stores must differ");
    if (
      !input.items.length ||
      input.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0)
    )
      throw new Error("Transfer quantities must be positive whole numbers");
    const [stores, validItems] = await Promise.all([
      prisma.store.count({
        where: {
          id: { in: [input.sourceStoreId, input.destinationStoreId] },
          orgId: input.orgId,
          isActive: true,
        },
      }),
      prisma.stockEntry.count({
        where: {
          storeId: input.sourceStoreId,
          store: { orgId: input.orgId },
          OR: input.items.map((item) => ({
            productId: item.productId,
            sizeId: item.sizeId,
          })),
        },
      }),
    ]);
    if (stores !== 2) throw new Error("Both stores must be active and belong to the organization");
    if (validItems !== new Set(input.items.map((item) => `${item.productId}:${item.sizeId}`)).size)
      throw new Error("One or more transfer variants are invalid");
    return prisma.stockTransfer.create({
      data: {
        orgId: input.orgId,
        sourceStoreId: input.sourceStoreId,
        destinationStoreId: input.destinationStoreId,
        requestedById: input.requestedById,
        notes: input.notes,
        expectedArrivalAt: input.expectedArrivalAt,
        recommendationEvidence: input.recommendationEvidence,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            sizeId: item.sizeId,
            requestedQuantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include,
    });
  },

  async approve(orgId: string, id: string, userId: string) {
    return prisma.$transaction(
      async (tx) => {
        const transfer = await tx.stockTransfer.findFirst({
          where: { id, orgId, status: "DRAFT" },
          include: { items: true },
        });
        if (!transfer) throw new Error("Draft transfer not found");
        for (const item of transfer.items) {
          const safety = await liveSafety(tx, transfer, item);
          validateLiveTransfer({
            quantity: item.requestedQuantity,
            safelyAvailable: safety.safelyAvailable,
            destinationNeed: safety.destinationNeed,
            recommendationBased: Boolean(transfer.recommendationEvidence),
          });
        }
        await Promise.all(
          transfer.items.map((item) =>
            tx.stockTransferItem.update({
              where: { id: item.id },
              data: { approvedQuantity: item.requestedQuantity },
            })
          )
        );
        return tx.stockTransfer.update({
          where: { id },
          data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async dispatch(orgId: string, id: string, userId: string) {
    return prisma.$transaction(
      async (tx) => {
        const transfer = await tx.stockTransfer.findFirst({
          where: { id, orgId, status: "APPROVED" },
          include: { items: true },
        });
        if (!transfer) throw new Error("Approved transfer not found");
        for (const item of transfer.items) {
          const safety = await liveSafety(tx, transfer, item);
          validateLiveTransfer({
            quantity: item.approvedQuantity,
            safelyAvailable: safety.safelyAvailable,
            destinationNeed: safety.destinationNeed,
            recommendationBased: Boolean(transfer.recommendationEvidence),
          });
          await adjustStockWithClient(tx, {
            orgId,
            productId: item.productId,
            sizeId: item.sizeId,
            storeId: transfer.sourceStoreId,
            quantity: item.approvedQuantity,
            type: "TRANSFER_OUT",
            reason: `Dispatched on stock transfer ${id}`,
            referenceType: "TRANSFER",
            referenceId: id,
            userId,
          });
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { dispatchedQuantity: item.approvedQuantity },
          });
        }
        return tx.stockTransfer.update({
          where: { id },
          data: { status: "DISPATCHED", dispatchedById: userId, dispatchedAt: new Date() },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async receive(
    orgId: string,
    id: string,
    userId: string,
    receipts: Array<{ itemId: string; receivedQuantity: number; damagedQuantity: number }>
  ) {
    return prisma.$transaction(
      async (tx) => {
        const transfer = await tx.stockTransfer.findFirst({
          where: { id, orgId, status: { in: ["DISPATCHED", "PARTIALLY_RECEIVED"] } },
          include: { items: true },
        });
        if (!transfer) throw new Error("Dispatched transfer not found");
        const receiptMap = new Map(receipts.map((receipt) => [receipt.itemId, receipt]));
        let allReconciled = true;
        let totalReceived = 0;
        let totalDamaged = 0;
        for (const item of transfer.items) {
          const receipt = receiptMap.get(item.id) ?? { receivedQuantity: 0, damagedQuantity: 0 };
          const result = reconcileTransfer({
            dispatched: item.dispatchedQuantity,
            previouslyReceived: item.receivedQuantity,
            previouslyDamaged: item.damagedQuantity,
            receiveNow: receipt.receivedQuantity,
            damageNow: receipt.damagedQuantity,
          });
          if (receipt.receivedQuantity > 0)
            await adjustStockWithClient(tx, {
              orgId,
              productId: item.productId,
              sizeId: item.sizeId,
              storeId: transfer.destinationStoreId,
              quantity: receipt.receivedQuantity,
              type: "TRANSFER_IN",
              reason: `Received on stock transfer ${id}`,
              referenceType: "TRANSFER",
              referenceId: id,
              userId,
            });
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { receivedQuantity: result.received, damagedQuantity: result.damaged },
          });
          totalReceived += result.received;
          totalDamaged += result.damaged;
          if (result.unresolved > 0) allReconciled = false;
        }
        const status = allReconciled ? "RECEIVED" : "PARTIALLY_RECEIVED";
        return tx.stockTransfer.update({
          where: { id },
          data: {
            status,
            receivedById: userId,
            receivedAt: allReconciled ? new Date() : undefined,
            outcome: allReconciled
              ? {
                  completedAt: new Date().toISOString(),
                  quantityReceived: totalReceived,
                  quantityDamagedOrMissing: totalDamaged,
                  completionHours: transfer.dispatchedAt
                    ? Number(
                        ((Date.now() - transfer.dispatchedAt.getTime()) / 3_600_000).toFixed(1)
                      )
                    : null,
                  destinationStockoutAvoided: null,
                  sourceStockoutCreated: null,
                  descriptiveOnly: true,
                }
              : undefined,
          },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async cancel(orgId: string, id: string) {
    const result = await prisma.stockTransfer.updateMany({
      where: { id, orgId, status: { in: ["DRAFT", "APPROVED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (!result.count) throw new Error("Only draft or approved transfers may be cancelled");
    return prisma.stockTransfer.findUniqueOrThrow({ where: { id }, include });
  },
};
