import { expect, test, type Page } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => e2eDb.$disconnect());

const unique = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

async function createPurchaseOrder(
  page: Page,
  options: {
    quantity?: number;
    unitCost?: number;
    productId?: string;
    notes?: string;
    issue?: boolean;
  } = {},
) {
  const response = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      notes: options.notes ?? unique("QA PO"),
      items: [
        {
          productId: options.productId ?? E2E_IDS.secondProduct,
          sizeId: E2E_IDS.size,
          quantity: options.quantity ?? 2,
          unitCost: options.unitCost ?? 300,
        },
      ],
    },
  });
  const po = await expectJson<{
    id: string;
    status: string;
    totalAmount: number;
    items: Array<{ id: string }>;
  }>(response, 201);
  if (options.issue !== false) {
    await expectJson(await apiFetch(page, `/api/purchase-orders/${po.id}/submit`, { method: "POST" }), 200);
  }
  return po;
}

async function receive(
  page: Page,
  po: { id: string; items: Array<{ id: string }> },
  quantities: { received: number; accepted: number; held?: number; rejected?: number; damaged?: number },
  options: { key?: string; unitCost?: number; defectReason?: string } = {},
) {
  const response = await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, {
    method: "POST",
    headers: { "idempotency-key": options.key ?? unique("qa-receipt") },
    data: {
      items: [
        {
          purchaseOrderItemId: po.items[0].id,
          receivedQuantity: quantities.received,
          acceptedQuantity: quantities.accepted,
          heldQuantity: quantities.held ?? 0,
          rejectedQuantity: quantities.rejected ?? 0,
          damagedQuantity: quantities.damaged ?? 0,
          ...(quantities.damaged
            ? {
                defectQuantity: quantities.damaged,
                defectReason: options.defectReason ?? "QA damaged packaging",
              }
            : {}),
          ...(options.unitCost === undefined ? {} : { unitCostActual: options.unitCost }),
        },
      ],
    },
  });
  return expectJson(response, 200);
}

test("QA-PO-001 draft edit, issue and cancellation preserve stock and finance invariants", async ({ page }) => {
  const openingStock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const openingPayables = await e2eDb.supplierPayable.count();
  const openingTransactions = await e2eDb.financialTransaction.count();
  const productCount = await e2eDb.product.count({ where: { orgId: E2E_IDS.organization } });

  const po = await expectJson<{
    id: string;
    status: string;
    totalAmount: number;
    items: Array<{ id: string; itemKind: string; productName: string }>;
  }>(
    await apiFetch(page, "/api/purchase-orders", {
      method: "POST",
      data: {
        storeId: E2E_IDS.store,
        supplierId: E2E_IDS.supplier,
        notes: "QA mixed draft",
        items: [
          { productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 2, unitCost: 300 },
          {
            itemKind: "PROVISIONAL_PRODUCT",
            productName: "Zara Assorted Jeans",
            sizeLabel: "Assorted",
            quantity: 50,
            unitCost: 500,
          },
        ],
      },
    }),
    201,
  );
  expect(po.status).toBe("DRAFT");
  expectMoney(po.totalAmount, 25_600);
  expect(po.items.map((item) => item.itemKind).sort()).toEqual([
    "EXISTING_PRODUCT",
    "PROVISIONAL_PRODUCT",
  ]);
  expect(await e2eDb.product.count({ where: { orgId: E2E_IDS.organization } })).toBe(productCount);

  const updated = await expectJson<{ status: string; totalAmount: number; notes: string; items: unknown[] }>(
    await apiFetch(page, `/api/purchase-orders/${po.id}`, {
      method: "PUT",
      data: {
        notes: "QA edited draft",
        items: [{ productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 3, unitCost: 325 }],
      },
    }),
    200,
  );
  expect(updated.status).toBe("DRAFT");
  expect(updated.notes).toBe("QA edited draft");
  expect(updated.items).toHaveLength(1);
  expectMoney(updated.totalAmount, 975);

  const issued = await expectJson<{ status: string }>(
    await apiFetch(page, `/api/purchase-orders/${po.id}/submit`, { method: "POST" }),
    200,
  );
  expect(issued.status).toBe("ORDERED");
  const cancelled = await expectJson<{ status: string }>(
    await apiFetch(page, `/api/purchase-orders/${po.id}`, { method: "DELETE" }),
    200,
  );
  expect(cancelled.status).toBe("CANCELLED");

  const closingStock = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: openingStock.id } });
  expect(closingStock.quantity).toBe(openingStock.quantity);
  expect(await e2eDb.supplierPayable.count()).toBe(openingPayables);
  expect(await e2eDb.financialTransaction.count()).toBe(openingTransactions);
});

test("QA-PO-002 malformed and cross-tenant purchase inputs are rejected atomically", async ({ page }) => {
  const before = await e2eDb.purchaseOrder.count({ where: { orgId: E2E_IDS.organization } });
  const zeroQuantity = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      items: [{ productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 0, unitCost: 300 }],
    },
  });
  expect(zeroQuantity.status).toBe(400);

  const foreignStore = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.foreignStore,
      supplierId: E2E_IDS.supplier,
      items: [{ productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 1, unitCost: 300 }],
    },
  });
  expect(foreignStore.status).toBe(403);

  const foreignProduct = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      items: [{ productId: E2E_IDS.foreignProduct, sizeId: E2E_IDS.foreignSize, quantity: 1, unitCost: 300 }],
    },
  });
  expect(foreignProduct.status).toBeGreaterThanOrEqual(400);
  expect(await e2eDb.purchaseOrder.count({ where: { orgId: E2E_IDS.organization } })).toBe(before);
});

test("QA-GRN-001 partial damaged receipt and close-short preserve evidence and accepted-only stock", async ({ page }) => {
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const po = await createPurchaseOrder(page, { quantity: 6, unitCost: 300 });
  const received = await receive(
    page,
    po,
    { received: 4, accepted: 3, held: 1, damaged: 1 },
    { defectReason: "Torn seam" },
  ) as { status: string };
  expect(received.status).toBe("PARTIALLY_RECEIVED");
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stock.id } })).quantity).toBe(stock.quantity + 3);

  const receipt = await e2eDb.purchaseOrderReceipt.findFirstOrThrow({
    where: { purchaseOrderId: po.id },
    include: { items: { include: { defect: true } }, discrepancies: true },
  });
  expect(receipt.items[0]).toMatchObject({
    quantityReceived: 4,
    quantityAccepted: 3,
    quantityHeld: 1,
    quantityDamaged: 1,
  });
  expect(receipt.items[0].defect?.reason).toBe("Torn seam");
  expect(receipt.discrepancies).toHaveLength(1);
  expect(receipt.discrepancies[0].discrepancyNumber).toMatch(/^DISC-/);

  const closed = await expectJson<{ status: string; closureReason: string }>(
    await apiFetch(page, `/api/purchase-orders/${po.id}/close`, {
      method: "POST",
      data: { reason: "Supplier short-shipped two units" },
    }),
    200,
  );
  expect(closed.status).toBe("CLOSED");
  expect(closed.closureReason).toBe("Supplier short-shipped two units");
  expect(await e2eDb.purchaseOrderReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(1);
  expect((await apiFetch(page, `/api/purchase-orders/${po.id}`, { method: "DELETE" })).status).toBeGreaterThanOrEqual(400);
});

test("QA-CON-001 simultaneous full receipts cannot over-receive one purchase order", async ({ page }) => {
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const po = await createPurchaseOrder(page, { quantity: 2 });
  const results = await page.evaluate(
    async ({ poId, itemId }) => {
      const body = JSON.stringify({
        items: [{
          purchaseOrderItemId: itemId,
          receivedQuantity: 2,
          acceptedQuantity: 2,
          heldQuantity: 0,
          rejectedQuantity: 0,
          damagedQuantity: 0,
        }],
      });
      return Promise.all(
        ["qa-concurrent-a", "qa-concurrent-b"].map(async (key) => {
          const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
            method: "POST",
            headers: { "content-type": "application/json", "idempotency-key": key },
            body,
          });
          return response.status;
        }),
      );
    },
    { poId: po.id, itemId: po.items[0].id },
  );
  expect(results.sort((a, b) => a - b)[0]).toBe(200);
  expect(results[1]).toBeGreaterThanOrEqual(400);
  expect(await e2eDb.purchaseOrderReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(1);
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stock.id } })).quantity).toBe(stock.quantity + 2);
});

test("QA-VAL-001 receipt applies a moving weighted average and immutable valuation evidence", async ({ page }) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const product = await e2eDb.product.create({
    data: {
      orgId: E2E_IDS.organization,
      categoryId: E2E_IDS.category,
      brandId: E2E_IDS.brand,
      name: `QA Valuation Product ${suffix}`,
      sku: `QA-VAL-${suffix}`,
      basePrice: 900,
      mrp: 900,
      costPrice: 400,
      attributes: {},
    },
  });
  await e2eDb.stockEntry.create({
    data: {
      productId: product.id,
      sizeId: E2E_IDS.size,
      storeId: E2E_IDS.store,
      quantity: 10,
      averageUnitCost: 400,
      variantSku: `${product.sku}-M`,
    },
  });
  const po = await createPurchaseOrder(page, { quantity: 10, unitCost: 600, productId: product.id });
  await receive(page, po, { received: 10, accepted: 10 }, { unitCost: 600 });

  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: { productId_sizeId_storeId: { productId: product.id, sizeId: E2E_IDS.size, storeId: E2E_IDS.store } },
  });
  expect(stock.quantity).toBe(20);
  expect(Number(stock.averageUnitCost)).toBe(500);
  const valuation = await e2eDb.inventoryValuationEvent.findFirstOrThrow({
    where: { receipt: { purchaseOrderId: po.id } },
  });
  expect(Number(valuation.previousAverage)).toBe(400);
  expect(Number(valuation.resultingAverage)).toBe(500);
  expect(valuation.quantity).toBe(10);
});

test("QA-GRN-002 latest receipt reversal restores stock and keeps append-only audit evidence", async ({ page }) => {
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const po = await createPurchaseOrder(page, { quantity: 2, unitCost: 310 });
  await receive(page, po, { received: 2, accepted: 2 }, { unitCost: 310 });
  const original = await e2eDb.purchaseOrderReceipt.findFirstOrThrow({ where: { purchaseOrderId: po.id } });
  await expectJson(
    await apiFetch(page, `/api/purchase-orders/${po.id}/receipts/${original.id}/reverse`, {
      method: "POST",
      headers: { "idempotency-key": unique("qa-reversal") },
      data: { reason: "QA correction" },
    }),
    200,
  );
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stock.id } })).quantity).toBe(stock.quantity);
  expect((await e2eDb.purchaseOrderReceipt.findUniqueOrThrow({ where: { id: original.id } })).postingStatus).toBe("REVERSED");
  expect(await e2eDb.purchaseOrderReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(2);
  expect(await e2eDb.inventoryValuationEvent.count({ where: { receipt: { purchaseOrderId: po.id } } })).toBe(2);
});

test("QA-BILL-001 price mismatch requires approval and posting remains idempotent", async ({ page }) => {
  const po = await createPurchaseOrder(page, { quantity: 2, unitCost: 500 });
  await receive(page, po, { received: 2, accepted: 2 });
  const invoice = unique("QA-PRICE-MISMATCH");
  const bill = await expectJson<{ id: string; matchStatus: string; totalAmount: number }>(
    await apiFetch(page, "/api/purchasing/bills", {
      method: "POST",
      data: {
        storeId: E2E_IDS.store,
        supplierId: E2E_IDS.supplier,
        purchaseOrderId: po.id,
        supplierInvoiceNumber: invoice,
        invoiceDate: "2026-10-13",
        additionalCharges: 0,
        discountAmount: 0,
        taxAmount: 0,
        lines: [{
          purchaseOrderItemId: po.items[0].id,
          description: "QA price mismatch",
          quantity: 2,
          unitCost: 520,
          taxAmount: 0,
          discountAmount: 0,
        }],
        allocations: [],
      },
    }),
    201,
  );
  expect(bill.matchStatus).toBe("DIFFERENCE");
  expect((await apiFetch(page, `/api/purchasing/bills/${bill.id}/post`, { method: "POST", data: {} })).status).toBeGreaterThanOrEqual(400);
  await expectJson(
    await apiFetch(page, `/api/purchasing/bills/${bill.id}/post`, { method: "POST", data: { approveDifference: true } }),
    200,
  );
  await expectJson(
    await apiFetch(page, `/api/purchasing/bills/${bill.id}/post`, { method: "POST", data: { approveDifference: true } }),
    200,
  );
  expect(await e2eDb.supplierPayable.count({ where: { billId: bill.id } })).toBe(1);
  expect(await e2eDb.financialTransaction.count({ where: { referenceId: bill.id } })).toBe(0);

  const duplicate = await apiFetch(page, "/api/purchasing/bills", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: invoice,
      invoiceDate: "2026-10-13",
      lines: [{ description: "Duplicate", quantity: 1, unitCost: 1, taxAmount: 0, discountAmount: 0 }],
      allocations: [],
    },
  });
  expect(duplicate.status).toBeGreaterThanOrEqual(400);
});

test("QA-DP-001 unpaid direct purchase replays once through the shared stock and payable pipeline", async ({ page }) => {
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const key = unique("qa-direct");
  const payload = {
    idempotencyKey: key,
    storeId: E2E_IDS.store,
    supplierId: E2E_IDS.supplier,
    supplierInvoiceNumber: unique("QA-DIRECT-INV"),
    invoiceDate: "2026-10-13",
    items: [{ productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 2, unitCost: 275 }],
  };
  const first = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/purchasing/direct", { method: "POST", data: payload }),
    201,
  );
  const replay = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/purchasing/direct", { method: "POST", data: payload }),
    201,
  );
  expect(replay.id).toBe(first.id);
  const purchase = await e2eDb.purchase.findUniqueOrThrow({
    where: { id: first.id },
    include: { bill: { include: { payable: true } }, receipt: true, purchaseOrder: true },
  });
  expect(purchase.purchaseOrder?.source).toBe("DIRECT_PURCHASE");
  expect(purchase.bill?.payable).not.toBeNull();
  expectMoney(purchase.bill?.payable?.outstandingAmount, 550);
  expect(await e2eDb.purchase.count({ where: { idempotencyKey: `DIRECT_PURCHASE:${E2E_IDS.organization}:${key}` } })).toBe(1);
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stock.id } })).quantity).toBe(stock.quantity + 2);
  expect(await e2eDb.financialTransaction.count({ where: { referenceId: purchase.bill?.payable?.id } })).toBe(0);
});

test("QA-UI-001 purchasing workspace renders and contains horizontal overflow at all required viewports", async ({ page }) => {
  const po = await createPurchaseOrder(page, { quantity: 1 });
  const pageErrors: string[] = [];
  const serverFailures: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) serverFailures.push(`${response.status()} ${response.url()}`);
  });
  const screens = [
    ["purchase-orders", "/dashboard/purchase-orders", "Purchase Orders"],
    ["create-purchase-order", "/dashboard/purchase-orders/new", "Create Purchase Order"],
    ["create-product", "/dashboard/products/new", "New Product"],
    ["receive-map", `/dashboard/purchase-orders/${po.id}?receive=1`, "Purchase Order"],
    ["receiving-queue", "/dashboard/purchase-orders/receiving", "Goods Receiving Queue"],
    ["inspection", "/dashboard/purchase-orders/inspection", "Inspection & Defects"],
    ["claims", "/dashboard/purchase-orders/claims", "Supplier Claims & Returns"],
    ["supplier-bills", "/dashboard/purchase-orders/bills", "Supplier Bill & 3-Way Match"],
    ["purchase-summary", "/dashboard/purchase-orders/summary", "Payments & Purchase Summary"],
    ["direct-purchase", "/dashboard/purchase-orders/direct", "Direct Purchase"],
  ] as const;
  const viewports = [
    ["desktop", 1440, 900],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ] as const;

  for (const [viewportName, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const [slug, path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
      await expect(page.locator(".ant-skeleton")).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (viewportName === "desktop" && slug === "claims") {
        await page.getByRole("button", { name: "New Claim" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
      }
      if (viewportName === "desktop" && slug === "supplier-bills") {
        await page.getByRole("button", { name: "New Supplier Bill" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
      }
      if (viewportName !== "tablet") {
        await page.screenshot({
          path: `docs/purchasing/qa-evidence/${slug}-${viewportName}.png`,
          fullPage: true,
        });
      }
    }
  }
  expect(pageErrors).toEqual([]);
  expect(serverFailures).toEqual([]);
});

test("QA-CLAIM-001 a terminal resolution cannot bypass the documented claim workflow", async ({ page }) => {
  const po = await createPurchaseOrder(page, { quantity: 1 });
  await receive(page, po, { received: 1, accepted: 0, held: 1, damaged: 1 });
  const discrepancy = await e2eDb.purchaseDiscrepancy.findFirstOrThrow({ where: { purchaseOrderId: po.id } });
  const claim = await expectJson<{ id: string; status: string }>(
    await apiFetch(page, "/api/purchasing/claims", {
      method: "POST",
      data: { discrepancyId: discrepancy.id, requestedResolution: "REPLACEMENT", quantity: 1 },
    }),
    201,
  );
  expect(claim.status).toBe("OPEN");
  const invalidTransition = await apiFetch(page, `/api/purchasing/claims/${claim.id}`, {
    method: "POST",
    data: { action: "RESOLVE", notes: "Attempt to skip replacement receipt" },
  });
  expect(invalidTransition.status).toBeGreaterThanOrEqual(400);
  expect((await e2eDb.supplierClaim.findUniqueOrThrow({ where: { id: claim.id } })).status).toBe("OPEN");
});

test("QA-BILL-002 quantity mismatch is detected by three-way matching", async ({ page }) => {
  const po = await createPurchaseOrder(page, { quantity: 2, unitCost: 500 });
  await receive(page, po, { received: 2, accepted: 2 });
  const bill = await expectJson<{ matchStatus: string }>(
    await apiFetch(page, "/api/purchasing/bills", {
      method: "POST",
      data: {
        storeId: E2E_IDS.store,
        supplierId: E2E_IDS.supplier,
        purchaseOrderId: po.id,
        supplierInvoiceNumber: unique("QA-QTY-MISMATCH"),
        invoiceDate: "2026-10-13",
        additionalCharges: 0,
        discountAmount: 0,
        taxAmount: 0,
        lines: [{
          purchaseOrderItemId: po.items[0].id,
          description: "Supplier invoiced three but two were accepted",
          quantity: 3,
          unitCost: 500,
          taxAmount: 0,
          discountAmount: 0,
        }],
        allocations: [],
      },
    }),
    201,
  );
  expect(bill.matchStatus).toBe("DIFFERENCE");
});
