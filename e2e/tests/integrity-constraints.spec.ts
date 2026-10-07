import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("analytics integrity identifies an isolated synthetic mismatch without mutating it", async ({ page }) => {
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: "00000000-0000-4000-8000-00000000e217" } });
  await e2eDb.stockEntry.update({ where: { id: stock.id }, data: { quantity: -7 } });
  try {
    const report = await expectJson<{
      issues: Array<{ code: string; count: number; sampleReferences: string[] }>;
    }>(await apiFetch(page, `/api/analytics/integrity?storeId=${E2E_IDS.store}`), 200);
    const issue = report.issues.find((row) => row.code === "NEGATIVE_STOCK");
    expect(issue).toMatchObject({ count: 1 });
    expect(issue?.sampleReferences).toContain(stock.id);
    expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stock.id } })).quantity).toBe(-7);
  } finally {
    await e2eDb.stockEntry.update({ where: { id: stock.id }, data: { quantity: stock.quantity } });
  }
});

test("critical database CHECK constraints reject invalid transfer and purchase data", async () => {
  await expect(
    e2eDb.stockTransfer.create({
      data: {
        orgId: E2E_IDS.organization,
        sourceStoreId: E2E_IDS.store,
        destinationStoreId: E2E_IDS.store,
        requestedById: E2E_IDS.user,
      },
    }),
  ).rejects.toThrow();

  const transfer = await e2eDb.stockTransfer.create({
    data: {
      orgId: E2E_IDS.organization,
      sourceStoreId: E2E_IDS.store,
      destinationStoreId: E2E_IDS.secondStore,
      requestedById: E2E_IDS.user,
      notes: "E2E database constraint parent",
    },
  });
  try {
    await expect(
      e2eDb.stockTransferItem.create({
        data: {
          transferId: transfer.id,
          productId: E2E_IDS.product,
          sizeId: E2E_IDS.size,
          requestedQuantity: 0,
        },
      }),
    ).rejects.toThrow();
    expect(await e2eDb.stockTransferItem.count({ where: { transferId: transfer.id } })).toBe(0);
  } finally {
    await e2eDb.stockTransfer.delete({ where: { id: transfer.id } });
  }

  await expect(
    e2eDb.purchase.create({
      data: {
        orgId: E2E_IDS.organization,
        storeId: E2E_IDS.store,
        supplierId: E2E_IDS.supplier,
        purchaseNumber: "E2E-INVALID-NEGATIVE-PURCHASE",
        purchaseDate: new Date("2026-10-07T00:00:00.000Z"),
        supplierNameSnapshot: "E2E Supplier",
        subtotal: -1,
        additionalCharges: 0,
        discountAmount: 0,
        totalAmount: -1,
        createdBy: E2E_IDS.user,
      },
    }),
  ).rejects.toThrow();
  expect(await e2eDb.purchase.count({ where: { purchaseNumber: "E2E-INVALID-NEGATIVE-PURCHASE" } })).toBe(0);
});
