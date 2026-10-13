import { Prisma } from "@prisma/client";

type ReceiptValuationInput = {
  orgId: string;
  storeId: string;
  productId: string;
  sizeId: string;
  variantId?: string | null;
  receiptId: string;
  receiptItemId: string;
  quantity: number;
  unitCost: Prisma.Decimal | number;
  userId: string;
};

export async function recordReceiptValuation(
  tx: Prisma.TransactionClient,
  input: ReceiptValuationInput,
) {
  const stock = await tx.stockEntry.findUnique({
    where: {
      productId_sizeId_storeId: {
        productId: input.productId,
        sizeId: input.sizeId,
        storeId: input.storeId,
      },
    },
    select: { quantity: true, averageUnitCost: true, product: { select: { costPrice: true } } },
  });
  if (!stock) throw new Error("Receipt stock was not posted before valuation");
  const resultingQuantity = stock.quantity;
  const previousQuantity = resultingQuantity - input.quantity;
  const previousAverage = stock.averageUnitCost ?? stock.product.costPrice;
  const unitCost = new Prisma.Decimal(input.unitCost);
  const resultingAverage = resultingQuantity > 0
    ? previousAverage.mul(previousQuantity).add(unitCost.mul(input.quantity)).div(resultingQuantity).toDecimalPlaces(4)
    : unitCost.toDecimalPlaces(4);

  await tx.stockEntry.update({
    where: {
      productId_sizeId_storeId: {
        productId: input.productId,
        sizeId: input.sizeId,
        storeId: input.storeId,
      },
    },
    data: { averageUnitCost: resultingAverage },
  });
  await tx.inventoryValuationEvent.create({
    data: {
      orgId: input.orgId,
      storeId: input.storeId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      receiptId: input.receiptId,
      receiptItemId: input.receiptItemId,
      eventType: "RECEIPT",
      quantity: input.quantity,
      unitCost,
      previousAverage,
      resultingAverage,
      resultingQuantity,
      sourceType: "PURCHASE_RECEIPT",
      sourceId: input.receiptId,
      idempotencyKey: `purchase-receipt:${input.receiptItemId}`,
      createdBy: input.userId,
    },
  });
  return resultingAverage;
}
