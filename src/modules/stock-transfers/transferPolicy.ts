export type TransferEvidenceQuality = "HIGH" | "MEDIUM" | "LOW";

export type StoreVariantPosition = {
  storeId: string;
  storeName: string;
  productId: string;
  sizeId: string;
  product: string;
  sku: string;
  variant: string;
  action: string;
  currentStock: number;
  recommendedQuantity: number | null;
  evidenceQuality: TransferEvidenceQuality;
  targetStock: number;
  reorderPoint: number;
  usefulInbound: number;
  coverDays: number | null;
  unfulfilledDemand: number;
  unitCost: number;
  forecastUpperDemand30?: number | null;
  forecastEvidenceQuality?: TransferEvidenceQuality | null;
};

export type TransferRecommendation = {
  key: string;
  type:
    | "TRANSFER_RECOMMENDED"
    | "TRANSFER_OPTIONAL"
    | "NO_TRANSFER_AVAILABLE"
    | "SUPPLIER_REORDER_REQUIRED"
    | "MONITOR";
  productId: string;
  sizeId: string;
  product: string;
  sku: string;
  variant: string;
  sourceStoreId: string | null;
  sourceStoreName: string | null;
  destinationStoreId: string;
  destinationStoreName: string;
  destinationRequirement: number;
  destinationCurrentStock: number;
  sourceProtectedStock: number | null;
  sourceTransferableExcess: number;
  recommendedQuantity: number;
  remainingSupplierRequirement: number;
  destinationCoverDays: number | null;
  sourceCoverAfterTransfer: number | null;
  evidenceQuality: TransferEvidenceQuality;
  transferredInventoryValue: number;
  reasons: string[];
};

const qualityRank: Record<TransferEvidenceQuality, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function buildTransferRecommendations(
  positions: StoreVariantPosition[]
): TransferRecommendation[] {
  const destinations = positions.filter((row) => ["REORDER", "STOCKOUT_RISK"].includes(row.action));
  const results: TransferRecommendation[] = [];

  for (const destination of destinations) {
    const requirement = Math.max(
      0,
      destination.recommendedQuantity ??
        destination.targetStock - destination.currentStock - destination.usefulInbound,
      destination.forecastUpperDemand30 && destination.forecastEvidenceQuality !== "LOW"
        ? Math.ceil(
            destination.forecastUpperDemand30 - destination.currentStock - destination.usefulInbound
          )
        : 0
    );
    if (requirement <= 0) continue;
    if (destination.evidenceQuality === "LOW") {
      results.push(
        emptyRecommendation(destination, requirement, "MONITOR", [
          "Destination evidence is too weak for a precise transfer quantity",
        ])
      );
      continue;
    }

    const sources = positions
      .filter(
        (source) =>
          source.storeId !== destination.storeId &&
          source.productId === destination.productId &&
          source.sizeId === destination.sizeId &&
          source.currentStock > source.targetStock &&
          source.unfulfilledDemand < 3 &&
          source.evidenceQuality !== "LOW"
      )
      .map((source) => {
        const forecastProtection =
          source.forecastUpperDemand30 && source.forecastEvidenceQuality !== "LOW"
            ? Math.ceil(source.forecastUpperDemand30)
            : 0;
        const protectedStock = Math.max(source.reorderPoint, forecastProtection, 0);
        const transferable = Math.max(0, source.currentStock - protectedStock);
        const quantity = Math.min(requirement, transferable);
        const velocity =
          source.coverDays && source.coverDays > 0 ? source.currentStock / source.coverDays : 0;
        const coverAfter = velocity > 0 ? round((source.currentStock - quantity) / velocity) : null;
        return { source, protectedStock, transferable, quantity, coverAfter };
      })
      .filter((candidate) => candidate.quantity > 0)
      .sort(
        (a, b) =>
          qualityRank[b.source.evidenceQuality] - qualityRank[a.source.evidenceQuality] ||
          (b.coverAfter ?? 0) - (a.coverAfter ?? 0) ||
          b.transferable - a.transferable ||
          a.source.storeName.localeCompare(b.source.storeName)
      );

    const best = sources[0];
    if (!best) {
      results.push(
        emptyRecommendation(destination, requirement, "SUPPLIER_REORDER_REQUIRED", [
          "No same-organization store can safely release this variant",
          `${requirement} units remain for supplier replenishment`,
        ])
      );
      continue;
    }
    const remaining = Math.max(0, requirement - best.quantity);
    results.push({
      key: `${best.source.storeId}:${destination.storeId}:${destination.productId}:${destination.sizeId}`,
      type: remaining === 0 ? "TRANSFER_RECOMMENDED" : "TRANSFER_OPTIONAL",
      productId: destination.productId,
      sizeId: destination.sizeId,
      product: destination.product,
      sku: destination.sku,
      variant: destination.variant,
      sourceStoreId: best.source.storeId,
      sourceStoreName: best.source.storeName,
      destinationStoreId: destination.storeId,
      destinationStoreName: destination.storeName,
      destinationRequirement: requirement,
      destinationCurrentStock: destination.currentStock,
      sourceProtectedStock: best.protectedStock,
      sourceTransferableExcess: best.transferable,
      recommendedQuantity: best.quantity,
      remainingSupplierRequirement: remaining,
      destinationCoverDays: destination.coverDays,
      sourceCoverAfterTransfer: best.coverAfter,
      evidenceQuality:
        qualityRank[best.source.evidenceQuality] < qualityRank[destination.evidenceQuality]
          ? best.source.evidenceQuality
          : destination.evidenceQuality,
      transferredInventoryValue: round(best.quantity * destination.unitCost, 2),
      reasons: [
        `${destination.storeName} requires ${requirement} units after timely inbound`,
        `${best.source.storeName} can release ${best.transferable} units while retaining ${best.protectedStock}`,
        ...(best.source.forecastUpperDemand30 && best.source.forecastEvidenceQuality !== "LOW"
          ? [
              `Source protection includes its ${best.source.forecastUpperDemand30}-unit 30-day upper forecast`,
            ]
          : []),
        remaining
          ? `${remaining} units still require supplier replenishment`
          : "The transfer can cover the full destination requirement",
      ],
    });
  }
  return results;
}

function emptyRecommendation(
  destination: StoreVariantPosition,
  requirement: number,
  type: TransferRecommendation["type"],
  reasons: string[]
): TransferRecommendation {
  return {
    key: `none:${destination.storeId}:${destination.productId}:${destination.sizeId}`,
    type,
    productId: destination.productId,
    sizeId: destination.sizeId,
    product: destination.product,
    sku: destination.sku,
    variant: destination.variant,
    sourceStoreId: null,
    sourceStoreName: null,
    destinationStoreId: destination.storeId,
    destinationStoreName: destination.storeName,
    destinationRequirement: requirement,
    destinationCurrentStock: destination.currentStock,
    sourceProtectedStock: null,
    sourceTransferableExcess: 0,
    recommendedQuantity: 0,
    remainingSupplierRequirement: requirement,
    destinationCoverDays: destination.coverDays,
    sourceCoverAfterTransfer: null,
    evidenceQuality: destination.evidenceQuality,
    transferredInventoryValue: 0,
    reasons,
  };
}

export function reconcileTransfer(input: {
  dispatched: number;
  previouslyReceived: number;
  previouslyDamaged: number;
  receiveNow: number;
  damageNow: number;
}) {
  const values = Object.values(input);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new Error("Transfer quantities must be non-negative whole numbers");
  const received = input.previouslyReceived + input.receiveNow;
  const damaged = input.previouslyDamaged + input.damageNow;
  if (received + damaged > input.dispatched)
    throw new Error("Receipt and damage cannot exceed dispatched quantity");
  const unresolved = input.dispatched - received - damaged;
  return {
    received,
    damaged,
    unresolved,
    status: unresolved === 0 ? ("RECEIVED" as const) : ("PARTIALLY_RECEIVED" as const),
  };
}

export function canPerformTransferAction(input: {
  role: string;
  userStoreId: string | null;
  sourceStoreId?: string;
  destinationStoreId?: string;
  action: "CREATE" | "APPROVE" | "CANCEL" | "DISPATCH" | "RECEIVE";
}) {
  const purchasingRole = ["OWNER", "ADMIN", "MANAGER"].includes(input.role);
  const organizationWide = purchasingRole && !input.userStoreId;
  if (["CREATE", "APPROVE", "CANCEL"].includes(input.action)) return organizationWide;
  if (organizationWide) return true;
  if (input.action === "DISPATCH") return input.userStoreId === input.sourceStoreId;
  return input.userStoreId === input.destinationStoreId;
}

export function validateLiveTransfer(input: {
  quantity: number;
  safelyAvailable: number;
  destinationNeed: number;
  recommendationBased: boolean;
}) {
  if (input.quantity > input.safelyAvailable)
    throw new Error(
      `Recommendation stale: only ${input.safelyAvailable} units are safely transferable`
    );
  if (input.recommendationBased && input.destinationNeed <= 0)
    throw new Error("Recommendation stale: destination requirement no longer exists");
}

export function dispatchAccounting(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error("Dispatch quantity must be a positive whole number");
  return { sourceDelta: -quantity, destinationDelta: 0, inTransitDelta: quantity };
}

export function receiptAccounting(input: { received: number; damaged: number }) {
  if (
    !Number.isSafeInteger(input.received) ||
    !Number.isSafeInteger(input.damaged) ||
    input.received < 0 ||
    input.damaged < 0
  )
    throw new Error("Receipt quantities must be non-negative whole numbers");
  return {
    destinationDelta: input.received,
    inTransitDelta: -(input.received + input.damaged),
  };
}
