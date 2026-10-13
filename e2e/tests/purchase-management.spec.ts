import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });
test.afterAll(async () => e2eDb.$disconnect());

async function createIssuedPo(page: import("@playwright/test").Page, quantity: number, suffix: string) {
  const po = await expectJson<{ id: string; items: Array<{ id: string }> }>(await apiFetch(page, "/api/purchase-orders", { method: "POST", data: { storeId: E2E_IDS.store, supplierId: E2E_IDS.supplier, notes: suffix, items: [{ productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity, unitCost: 300 }] } }), 201);
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/submit`, { method: "POST" }), 200);
  return po;
}

test("receipt idempotency replays identical payload and rejects changed payload", async ({ page }) => {
  const opening = await e2eDb.stockEntry.findUniqueOrThrow({ where: { productId_sizeId_storeId: { productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, storeId: E2E_IDS.store } } });
  const po = await createIssuedPo(page, 2, "payload-bound receipt");
  const payload = { receivedAt: new Date().toISOString(), items: [{ purchaseOrderItemId: po.items[0].id, receivedQuantity: 2, acceptedQuantity: 2, rejectedQuantity: 0, damagedQuantity: 0, unitCostActual: 300 }] };
  const headers = { "idempotency-key": "e2e-purchase-payload-bound" };
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, { method: "POST", headers, data: payload }), 200);
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, { method: "POST", headers, data: payload }), 200);
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, { method: "POST", headers, data: { ...payload, notes: "changed" } }), 409);
  const closing = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: opening.id } });
  expect(closing.quantity).toBe(opening.quantity + 2);
  expect(await e2eDb.purchaseOrderReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(1);
});

test("one provisional PO line splits into grouped SKU mappings and only accepted stock posts", async ({ page }) => {
  const [openingA, openingB, openingPayments, openingPayables] = await Promise.all([
    e2eDb.stockEntry.findUniqueOrThrow({ where: { productId_sizeId_storeId: { productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, storeId: E2E_IDS.store } } }),
    e2eDb.stockEntry.findUniqueOrThrow({ where: { productId_sizeId_storeId: { productId: E2E_IDS.product, sizeId: E2E_IDS.size, storeId: E2E_IDS.store } } }),
    e2eDb.supplierPayment.count(),
    e2eDb.supplierPayable.count(),
  ]);
  const po = await expectJson<{ id: string; items: Array<{ id: string }> }>(await apiFetch(page, "/api/purchase-orders", { method: "POST", data: { storeId: E2E_IDS.store, supplierId: E2E_IDS.supplier, items: [{ itemKind: "PROVISIONAL_PRODUCT", productName: "Assorted E2E Jeans", brandId: E2E_IDS.brand, categoryId: E2E_IDS.category, sizeLabel: "Assorted", quantity: 50, unitCost: 275 }] } }), 201);
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/submit`, { method: "POST" }), 200);
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, { method: "POST", headers: { "idempotency-key": "e2e-provisional-split" }, data: { items: [
    { mappingKey: "group-a", purchaseOrderItemId: po.items[0].id, receivedQuantity: 30, acceptedQuantity: 30, heldQuantity: 0, rejectedQuantity: 0, damagedQuantity: 0, catalogResolution: { mode: "LINK_EXISTING", productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size } },
    { mappingKey: "group-b", purchaseOrderItemId: po.items[0].id, receivedQuantity: 10, acceptedQuantity: 5, heldQuantity: 5, rejectedQuantity: 0, damagedQuantity: 5, defectReason: "Stitching defect", defectQuantity: 5, catalogResolution: { mode: "LINK_EXISTING", productId: E2E_IDS.product, sizeId: E2E_IDS.size } },
  ] } }), 200);
  const receipt = await e2eDb.purchaseOrderReceipt.findFirstOrThrow({ where: { purchaseOrderId: po.id }, include: { items: true, discrepancies: true } });
  expect(receipt.items).toHaveLength(2);
  expect(receipt.discrepancies).toHaveLength(1);
  expect(new Set(receipt.items.map((item) => item.productId))).toEqual(new Set([E2E_IDS.secondProduct, E2E_IDS.product]));
  expect(receipt.items.every((item) => item.purchaseOrderItemId === po.items[0].id && item.variantId)).toBe(true);
  const originalLine = await e2eDb.purchaseOrderItem.findUniqueOrThrow({ where: { id: po.items[0].id } });
  expect(originalLine).toMatchObject({ itemKind: "PROVISIONAL_PRODUCT", productId: null, sizeId: null, variantId: null, productNameSnapshot: "Assorted E2E Jeans", quantity: 50 });
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: openingA.id } })).quantity).toBe(openingA.quantity + 30);
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: openingB.id } })).quantity).toBe(openingB.quantity + 5);
  const movements = await e2eDb.stockMovement.findMany({ where: { referenceType: "PO", referenceId: receipt.id } });
  expect(movements).toHaveLength(2);
  expect(movements.reduce((sum, movement) => sum + movement.quantity, 0)).toBe(35);
  expect(await e2eDb.supplierPayment.count()).toBe(openingPayments);
  expect(await e2eDb.supplierPayable.count()).toBe(openingPayables);
});

test("bill posting creates one obligation without posting stock again", async ({ page }) => {
  const opening = await e2eDb.stockEntry.findUniqueOrThrow({ where: { productId_sizeId_storeId: { productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, storeId: E2E_IDS.store } } });
  const po = await createIssuedPo(page, 2, "bill does not repost stock");
  await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, { method: "POST", headers: { "idempotency-key": "e2e-bill-receipt" }, data: { items: [{ purchaseOrderItemId: po.items[0].id, receivedQuantity: 2, acceptedQuantity: 2, heldQuantity: 0, rejectedQuantity: 0, damagedQuantity: 0 }] } }), 200);
  const bill = await expectJson<{ id: string; totalAmount: number }>(await apiFetch(page, "/api/purchasing/bills", { method: "POST", data: { storeId: E2E_IDS.store, supplierId: E2E_IDS.supplier, purchaseOrderId: po.id, supplierInvoiceNumber: "E2E-BILL-NO-RESTOCK", invoiceDate: new Date().toISOString().slice(0, 10), additionalCharges: 0, discountAmount: 0, taxAmount: 0, lines: [{ purchaseOrderItemId: po.items[0].id, description: "E2E billed goods", quantity: 2, unitCost: 300, taxAmount: 0, discountAmount: 0 }], allocations: [] } }), 201);
  await expectJson(await apiFetch(page, `/api/purchasing/bills/${bill.id}/post`, { method: "POST", data: {} }), 200);
  const closing = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: opening.id } });
  expect(closing.quantity).toBe(opening.quantity + 2);
  const payable = await e2eDb.supplierPayable.findUniqueOrThrow({ where: { billId: bill.id } });
  expectMoney(payable.outstandingAmount, 600);
  expect(await e2eDb.financialTransaction.count({ where: { referenceId: bill.id } })).toBe(0);
});
